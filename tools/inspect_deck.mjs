import fs from 'node:fs/promises';
import {FileBlob, PresentationFile} from 'file:///C:/Users/asdzx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const root='C:/Dev/RatKnight';
const p=await PresentationFile.importPptx(await FileBlob.load(`${root}/docs/컨셉 기획서 v0.4.pptx`));
await fs.mkdir(`${root}/.codex-build/deck-before`,{recursive:true});
const info=await p.inspect({select:'$.slides[*]',include:['id','index','title','elements.id','elements.kind','elements.text','elements.alt','elements.position','notes.text']});
await fs.writeFile(`${root}/.codex-build/deck-before/content.ndjson`,info.ndjson);
for(let i=0;i<p.slides.items.length;i++){
 const png=await p.slides.items[i].export({format:'png',scale:1});
 await fs.writeFile(`${root}/.codex-build/deck-before/${i+1}.png`,new Uint8Array(await png.arrayBuffer()));
}
console.log(info.ndjson);
