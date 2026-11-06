// Refresh the read-only authoring manifest from the game's metadata, never import game.js (it boots the game).
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../../', import.meta.url);
const kfText = fs.readFileSync(new URL('squads/kf.js', root), 'utf8');
const KF = vm.runInNewContext(kfText.replace('export const KF =', 'const KF =') + '\nKF;', {}, {timeout:1000});
const game = fs.readFileSync(new URL('squads/game.js', root), 'utf8');
const start = game.indexOf('const SEQ = ') + 12;
const end = game.indexOf('\n};', start) + 2;
const seq = vm.runInNewContext('(' + game.slice(start,end) + ')', {}, {timeout:1000});
const rosterText = fs.readFileSync(new URL('squads/data.js',root),'utf8');
const rosterBlock = rosterText.slice(rosterText.indexOf('export const HEROES = {'),rosterText.indexOf('// ultimate damage type'));
const roster = [...rosterBlock.matchAll(/^\s*(\w+):\s*\{\s*name:\s*'([^']+)'/gm)].map(m=>[m[1],m[2]]);
if(!roster.length)throw Error('No roster found');
// Keep Gyakari first for existing authoring sessions; use real display names for all other IDs.
roster.sort((a,b)=>a[0]==='gyakari'?-1:b[0]==='gyakari'?1:0);
const characters = {};
for (const [id,name] of roster) {
 if(!KF[id]||!seq[id])throw Error('Missing animation metadata for '+id);
 characters[id] = {name, ref:KF[id].ref, frames:KF[id].p, sequences:seq[id]};
 for(const steps of Object.values(seq[id])) for(const step of steps) {
  if(!KF[id].p[step.p] || !(step.ms>0)) throw Error('Invalid sequence');
 }
}
fs.writeFileSync(new URL('manifest.json',import.meta.url),JSON.stringify({version:1,characters},null,2)+'\n');
