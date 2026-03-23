import express from "express";
import { auth } from "../middleware/auth.js";
import { upload } from "../configs/multer.js"; 

import {
    generateArticle,
    generateBlogTitles,
    generateImages,
    removeImageBackgound,
    removeImageObject,
    reviewResume,
} from "../controllers/aiControllers.js";

const aiRouter = express.Router();

aiRouter.post("/write-article", auth, generateArticle);
aiRouter.post("/blog-titles", auth, generateBlogTitles);
aiRouter.post("/generate-images", auth, generateImages);
aiRouter.post("/remove-background", auth, upload.single("image"), removeImageBackgound);
aiRouter.post("/remove-object", auth, upload.single("image"), removeImageObject);
aiRouter.post("/review-resume", auth, upload.single("resume"), reviewResume);

export default aiRouter;