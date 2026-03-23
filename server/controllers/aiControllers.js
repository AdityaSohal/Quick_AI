import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import FormData from "form-data";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_APK_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------ Generate Blog Titles ------------------
export const generateBlogTitles = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (!prompt) {
      return res.json({ success: false, message: "Prompt is required." });
    }

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({ success: false, message: "Limit Reached, Upgrade to Continue" });
    }

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ------------------ Generate Article ------------------
export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (!prompt) {
      return res.json({ success: false, message: "Please provide a prompt for article generation." });
    }

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({ success: false, message: "Limit Reached, Upgrade to Continue" });
    }

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    try {
      await sql`
        INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, ${prompt}, ${content}, 'article')
      `;
    } catch (dbError) {
      console.warn("⚠️ Database save failed:", dbError.message);
    }

    if (plan !== "premium") {
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: {
            free_usage: free_usage + 1,
          },
        });
      } catch (usageError) {
        console.warn("⚠️ Usage update failed:", usageError.message);
      }
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error("❌ Error in generateArticle:", error);
    res.json({ success: false, message: error.message || "Failed to generate article." });
  }
};

// ------------------ Generate Image ------------------
export const generateImages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({ success: false, message: "This feature is only available for premium users" });
    }

    const formData = new FormData();
    formData.append("prompt", prompt);

    const { data } = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": process.env.CLIPDROP_API_KEY,
      },
      responseType: "arraybuffer",
    });

    const base64Image = `data:image/png;base64,${Buffer.from(data, "binary").toString("base64")}`;
    const { secure_url } = await cloudinary.uploader.upload(base64Image);

    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ------------------ Remove Image Background ------------------
export const removeImageBackgound = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({ success: false, message: "This feature is only available for premium users" });
    }

    const imagePath = req.file?.path;
    if (!imagePath) {
      return res.json({ success: false, message: "No image uploaded" });
    }

    const { secure_url } = await cloudinary.uploader.upload(imagePath, {
      transformation: [{ effect: "background_removal" }],
    });

    // Clean up the local file after upload
    try {
      fs.unlinkSync(imagePath);
    } catch (e) {
      console.warn("Could not delete temp file:", e.message);
    }

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Remove Background From Image', ${secure_url}, 'image')
    `;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ------------------ Remove Object from Image ------------------
export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({ success: false, message: "This feature is only available for premium users" });
    }

    const imagePath = req.file?.path;
    const object = req.body?.object?.trim();

    if (!imagePath) {
      return res.json({ success: false, message: "No image uploaded" });
    }

    if (!object) {
      return res.json({ success: false, message: "Please specify the object to remove" });
    }

    // Upload original image to Cloudinary first
    const uploadResult = await cloudinary.uploader.upload(imagePath, {
      folder: "object_removal_originals",
    });

    // Clean up the local file after upload
    try {
      fs.unlinkSync(imagePath);
    } catch (e) {
      console.warn("Could not delete temp file:", e.message);
    }

    // Apply generative remove transformation via URL
    // Cloudinary generative remove: e_gen_remove:prompt_<object>
    const publicId = uploadResult.public_id;
    const processedUrl = cloudinary.url(publicId, {
      transformation: [
        { effect: `gen_remove:prompt_${object}` },
        { fetch_format: "auto", quality: "auto" },
      ],
      secure: true,
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Remove object: ${object} from image`}, ${processedUrl}, 'image')
    `;

    res.json({ success: true, content: processedUrl });
  } catch (error) {
    console.error("Error in removeImageObject:", error.message);
    res.json({ success: false, message: error.message || "Failed to remove object from image." });
  }
};

// ------------------ Review Resume ------------------
export const reviewResume = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({ success: false, message: "Limit Reached, Upgrade to Continue" });
    }

    const resumePath = req.file?.path;
    if (!resumePath) {
      return res.json({ success: false, message: "No resume file uploaded" });
    }

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(resumePath);
    const pdfData = await pdf(pdfBuffer);
    const resumeText = pdfData.text;

    // Clean up the local file after reading
    try {
      fs.unlinkSync(resumePath);
    } catch (e) {
      console.warn("Could not delete temp file:", e.message);
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return res.json({ success: false, message: "Could not extract text from the PDF. Please ensure it is a text-based PDF." });
    }

    const prompt = `You are an expert resume reviewer and career coach. Please review the following resume and provide detailed, actionable feedback.

Resume Content:
${resumeText}

Please provide a comprehensive review covering:

## Overall Assessment
Brief summary of the resume's strengths and weaknesses.

## Formatting & Structure
- Layout and readability
- Section organization
- Length and whitespace usage

## Content Quality
- Impact of bullet points and descriptions
- Use of action verbs and quantifiable achievements
- Relevance of information included

## Skills & Keywords
- Technical and soft skills presented
- ATS (Applicant Tracking System) keyword optimization
- Industry-relevant terminology

## Experience Section
- Quality of job descriptions
- Demonstration of accomplishments vs responsibilities
- Career progression clarity

## Education & Certifications
- Presentation of academic background
- Relevant certifications or courses

## Specific Improvements
List 5-7 concrete, actionable suggestions to improve this resume.

## Overall Score
Rate this resume out of 10 and explain the rating.`;

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    try {
      await sql`
        INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, 'Resume Review', ${content}, 'resume-review')
      `;
    } catch (dbError) {
      console.warn("⚠️ Database save failed:", dbError.message);
    }

    if (plan !== "premium") {
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: {
            free_usage: free_usage + 1,
          },
        });
      } catch (usageError) {
        console.warn("⚠️ Usage update failed:", usageError.message);
      }
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error("Error in reviewResume:", error.message);
    res.json({ success: false, message: error.message || "Failed to review resume." });
  }
};