const o=t=>{if(!t)return"";const n=t.split(`
`).filter(e=>e.trim());return n.some(e=>/^\d+\)/.test(e.trim()))?n.map(e=>{const s=e.trim(),i=s.match(/^(\d+)\)(.*)$/);if(i){const[,m,a]=i;return`${m}) ${a.trim()}`}return s}).join(`
`):t},u=t=>t?t.split(`
`).filter(r=>r.trim()).some(r=>/^\d+\)/.test(r.trim())):!1;export{o as f,u as h};
