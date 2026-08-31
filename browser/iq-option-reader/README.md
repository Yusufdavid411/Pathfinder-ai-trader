# Browser-side IQ Option reader

This directory is a Chromium extension content-script package. Run
`npm run build:extension` after changing a source module; the generated single
script is directly loadable by Manifest V3 and userscript tooling. The collector reads
only conservative, explicitly configured DOM selectors and renders JSON locally.
It requests no extension permissions and sends no data anywhere.
