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
  return res.json({ success: false, message: "This feature is not available yet." });
};

// ------------------ Review Resume ------------------
export const reviewResume = async (req, res) => {
  return res.json({ success: false, message: "This feature is not available yet." });
};
