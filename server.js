const express = require('express');
const app = express();
const fs = require('fs');
const uuid = require('uuid');
const child_process = require('child_process');
const port = process.env.PORT || 3000;

const texFolder = 'tex';
const cacheFile = 'cache.json';
if (!fs.existsSync(texFolder)) {
    fs.mkdirSync(texFolder);
}
if (!fs.existsSync(cacheFile)) {
    fs.writeFileSync(cacheFile, '{}');
}

app.get('/', (req, res) => {
    res.send('¡Bienvenido a la API de tex2svg!');
});

app.get('/api/tex2svg', (req, res) => {
    const tex = req.query.tex;
    let template = req.query.template;
    if (!template) {
        template = String.raw`\documentclass[preview]{standalone}
\usepackage[english]{babel}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{xcolor}

\begin{document}
[TEX]
\end{document}`; // default template
    }
    let stringToSubstitute = req.query.stringToSubstitute;
    if (!stringToSubstitute) {
        stringToSubstitute = '[TEX]';
    }
    const content = template.replace(stringToSubstitute, tex);
    const filenameBase = uuid.v4();
    const texFilename = `${filenameBase}.tex`;
    const dviFilename = `${filenameBase}.dvi`;
    const svgFilename = `${filenameBase}.svg`;
    const texPath = `${texFolder}/${texFilename}`;
    const dviPath = `${texFolder}/${dviFilename}`;
    const svgPath = `${texFolder}/${svgFilename}`;
    const cache = JSON.parse(fs.readFileSync(cacheFile));
    if (content in cache) {
        res.send(cache[content]);
        return;
    }
    fs.writeFileSync(texPath, content);
    try {
        child_process.execSync(`latex -interaction=nonstopmode --shell-escape -halt-on-error --output-directory=${texFolder} ${texPath}`);
        child_process.execSync(`dvisvgm ${dviPath} -n -o ${svgPath}`);
    } catch (e) {
        res.status(500).send(`Internal server error: ${e}`);
        return;
    }
    const svg = fs.readFileSync(svgPath, 'utf8');
    cache[content] = svg;
    fs.writeFileSync(cacheFile, JSON.stringify(cache));
    res.type('svg');
    res.set("Content-Security-Policy", "default-src 'self'");
    res.send(svg);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
