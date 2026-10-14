# Third-party notices

## React, React DOM and Scheduler

The application depends on React and React DOM 19.1.1 and their Scheduler runtime. They are installed from npm, not copied into this source repository. The offline build bundles their production code into the generated HTML. Upstream license comments are retained.

Copyright (c) Meta Platforms, Inc. and affiliates.

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Development tools

TypeScript, Vite, the React Vite plugin, esbuild and TypeScript definitions are development dependencies. Refer to their installed npm packages for the respective licenses. They are not shipped as application runtime libraries.

## Assets

Console, controller and smartphone illustrations and interface icons are native SVG components created for the application in `src/ui.tsx`, `src/shop-console-art.tsx` and `src/guide-device-art.tsx`.

The RépaRapid logo and favicon come from the public [RépaRapid website](https://reparapid.fr/). The Maxxi Games logo is the unmodified PNG from the [Maxxi Games inSiti listing](https://www.insiti.com/search/enseignes/maxxi-games-jeux-video), available at [its public asset URL](https://s3.eu-west-3.amazonaws.com/insiti.com/logos/5064/big_square/168541.png). These brand assets are included to present the requested RépaRapid / Maxxi Games service; the application's MIT licence does not grant rights to these logos or trademarks.

Oxanium is self-hosted in `public/fonts/oxanium.ttf`, from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/oxanium). Its SIL Open Font License is retained in `public/fonts/oxanium-OFL.txt`.

Tutorial prose is original French editorial content with links to the relevant manufacturer documentation and iFixit procedures. Upstream photographs and article bodies are not bundled. Manufacturer and product names identify the devices discussed; no manufacturer affiliation or endorsement is implied.
