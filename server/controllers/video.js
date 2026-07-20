import video from "../Modals/video.js";

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res.status(404).json({ message: "Please upload a video file only" });
  }
  try {
    const file = new video({
      videotitle:  req.body.videotitle,
      filename:    req.file.filename || req.file.originalname,
      // Cloudinary returns secure_url; fallback to path for local dev
      filepath:    req.file.path,
      filetype:    req.file.mimetype,
      filesize:    req.file.size || 0,
      videochanel: req.body.videochanel,
      uploader:    req.body.uploader,
      description: req.body.description || "",
      isPremium:   req.body.isPremium === "true" || req.body.isPremium === true,
    });
    await file.save();
    return res.status(201).json("file uploaded successfully");
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getvideo = async (req, res) => {
  const { id } = req.params;
  try {
    const file = await video.findById(id);
    if (!file) {
      return res.status(404).json({ message: "Video not found" });
    }
    return res.status(200).json(file);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
