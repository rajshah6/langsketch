// js/file_utilities.js - File system utility functions
(function (global) {

  /**
   * Recursively searches for a file in a project directory
   * @param {string} projectPath - Root path to search in
   * @param {string} fileName - Name of the file to find
   * @returns {string|null} Full path to the file or null if not found
   */
  function findFileInProject(projectPath, fileName) {
    try {
      const fs = require('fs');
      const path = require('path');

      function searchDirectory(dir) {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            const result = searchDirectory(itemPath);
            if (result) return result;
          } else if (item === fileName) {
            return itemPath;
          }
        }

        return null;
      }

      return searchDirectory(projectPath);
    } catch (error) {
      console.error('Error searching for file:', error);
      return null;
    }
  }

  // Export to App namespace
  global.App = global.App || {};
  global.App.fileUtilities = {
    findFileInProject
  };

  // Global export for back-compatibility
  global.findFileInProject = findFileInProject;

})(window);