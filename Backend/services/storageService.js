const fs = require("fs").promises;
const path = require("path");
const config = require("../config");

/**
 * Service to manage request-based file storage
 */
const storageService = {
  /**
   * Initialize a new request workspace
   * @param {string} requestId Unique ID for the request
   * @returns {Object} Paths to generated directories
   */
  async initWorkspace(requestId) {
    const rootDir = path.join(config.storageDir, requestId);
    const subDirs = {
      raw: path.join(rootDir, "raw"),
      processed: path.join(rootDir, "processed"),
      outputs: path.join(rootDir, "outputs"),
    };

    try {
      // Atomic recursive creation
      await fs.mkdir(subDirs.raw, { recursive: true });
      await fs.mkdir(subDirs.processed, { recursive: true });
      await fs.mkdir(subDirs.outputs, { recursive: true });

      return {
        root: rootDir,
        ...subDirs,
      };
    } catch (error) {
      console.error(`Failed to create workspace for ${requestId}:`, error);
      throw new Error("STORAGE_INIT_FAILED");
    }
  },

  /**
   * Store metadata for the imagery in the request folder
   * @param {string} requestId 
   * @param {Object} metadata 
   */
  async saveMetadata(requestId, metadata) {
    const filePath = path.join(config.storageDir, requestId, "metadata.json");
    try {
      await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error(`Failed to save metadata for ${requestId}:`, error);
      // Non-critical error, do not throw
    }
  },
};

module.exports = storageService;
