/** CommonJS so PostCSS can require() tailwindcss (fixes ESM resolution) */
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
