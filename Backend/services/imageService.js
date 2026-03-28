const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");
const copernicusService = require("./copernicusService");

/**
 * Service to download satellite imagery or generate demo images
 */
const imageService = {
  /**
   * Download actual Copernicus imagery using Process API
   */
  async downloadSceneImage(bbox, scene, outputPath, outputPath256 = null) {
    try {
      const result = await copernicusService.downloadSceneImage(bbox, scene);
      
      // Save full resolution (1024x1024) for display
      await sharp(result.data)
        .modulate({ brightness: 1.05 })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Image saved (full-res): ${outputPath}`);
      
      // Also save 256x256 version for ML model if path provided
      if (outputPath256) {
        await sharp(result.data)
          .resize(256, 256, { fit: "cover" })
          .modulate({ brightness: 1.05 })
          .png()
          .toFile(outputPath256);
        
        console.log(`✅ Image saved (256x256): ${outputPath256}`);
      }
      
      return { success: true, path: outputPath, path256: outputPath256 };
    } catch (error) {
      console.log(`Image download failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Generate a demo image when real imagery is unavailable
   * Creates realistic-looking satellite imagery for testing
   */
  async generateDemoImage(outputPath, aoiBbox, type = "natural") {
    const width = 256;
    const height = 256;
    
    // Create synthetic satellite-like imagery
    const channels = 3;
    const data = Buffer.alloc(width * height * channels);
    
    // Use bbox to seed the random generator for determinism
    const seed = Math.abs(aoiBbox.reduce((a, b) => a + b * 1000, 0)) % 10000;
    const seededRandom = (i) => {
      const x = Math.sin(seed + i) * 10000;
      return x - Math.floor(x);
    };
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        const noise = seededRandom(i);
        
        if (type === "past") {
          // Green-ish natural landscape
          data[i] = Math.floor(30 + noise * 50);      // R
          data[i + 1] = Math.floor(80 + noise * 80);  // G
          data[i + 2] = Math.floor(30 + noise * 40);  // B
        } else {
          // More urbanized/changed landscape
          const change = seededRandom(i + 1000) > 0.7;
          if (change) {
            // Urban/built-up areas (gray)
            data[i] = Math.floor(120 + noise * 50);
            data[i + 1] = Math.floor(120 + noise * 50);
            data[i + 2] = Math.floor(120 + noise * 50);
          } else {
            // Remaining vegetation
            data[i] = Math.floor(35 + noise * 45);
            data[i + 1] = Math.floor(70 + noise * 70);
            data[i + 2] = Math.floor(35 + noise * 35);
          }
        }
      }
    }
    
    await sharp(data, {
      raw: {
        width,
        height,
        channels
      }
    })
      .png()
      .toFile(outputPath);
    
    return { success: true, path: outputPath, demo: true };
  },
  
  /**
   * Fetch images for a change detection request
   * Returns both high-res (for display) and 256x256 (for ML model)
   */
  async fetchProjectImages(workspace, scene1, scene2, bbox, useDemoMode = false) {
    // High-res paths (for display)
    const pastImagePathHires = path.join(workspace.raw, "past_hires.png");
    const currentImagePathHires = path.join(workspace.raw, "current_hires.png");
    
    // 256x256 paths (for ML model)
    const pastImagePath256 = path.join(workspace.raw, "past.png");
    const currentImagePath256 = path.join(workspace.raw, "current.png");
    
    let pastResult, currentResult;
    let isDemo = useDemoMode;
    
    if (!useDemoMode) {
      // Try to download real images using Process API
      console.log("Downloading real satellite imagery...");
      
      [pastResult, currentResult] = await Promise.all([
        this.downloadSceneImage(bbox, scene1, pastImagePathHires, pastImagePath256),
        this.downloadSceneImage(bbox, scene2, currentImagePathHires, currentImagePath256)
      ]);
      
      isDemo = !pastResult.success || !currentResult.success;
      
      if (isDemo) {
        console.log("Real download failed, falling back to demo mode");
      }
    }
    
    if (isDemo) {
      // Generate demo images (256x256 only)
      console.log("Generating demo satellite imagery...");
      
      await Promise.all([
        this.generateDemoImage(pastImagePath256, bbox, "past"),
        this.generateDemoImage(currentImagePath256, bbox, "current")
      ]);
      
      // For demo mode, copy 256x256 to high-res path too
      const fs = require("fs");
      await fs.promises.copyFile(pastImagePath256, pastImagePathHires);
      await fs.promises.copyFile(currentImagePath256, currentImagePathHires);
    }
    
    return {
      past_image_path: pastImagePath256,        // For ML model (256x256)
      current_image_path: currentImagePath256,  // For ML model (256x256)
      past_image_path_hires: pastImagePathHires,     // For display (1024x1024)
      current_image_path_hires: currentImagePathHires, // For display (1024x1024)
      is_demo_mode: isDemo
    };
  }
};

module.exports = imageService;
