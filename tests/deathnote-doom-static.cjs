const assert=require('node:assert/strict'),fs=require('node:fs');
const engine=fs.readFileSync(__dirname+'/../effects/game-engine.js','utf8');
const adapter=fs.readFileSync(__dirname+'/../effects/online-adapter.js','utf8');
const online=fs.readFileSync(__dirname+'/../effects/online-animations.js','utf8');
for(const needle of ['G.pendingDeathNote.draft=chosen.slice(0,typed)','publishDeathNoteDraft?.(e.target.value','window.DAISHUGO_SHOW_DEATH_NOTE_DRAFT','if (c.name === "ドクタードゥーム") {','G.actionLocked = true','applyCharacterBgmMobileVolume(music)','gain.gain.value = 0.2 * loudnessMatch * mobileBgmMultiplier'])assert.ok(engine.includes(needle),needle);
for(const needle of ["deathNoteDraftRef.on('value',onDeathNoteDraft)","ref.child('deathNoteDraft').set",'publishDeathNoteDraft,','window.stopDoomEntry?.()'])assert.ok(adapter.includes(needle),needle);
assert.ok(online.includes('case "ドクタードゥーム":'));
for(const file of ['index.html','online-mode.html','online-mode-4.html'])assert.ok(fs.readFileSync(__dirname+'/../'+file,'utf8').includes('effects/doom-entry.js'));
console.log('Death Note sync, Doom hook and mobile BGM static checks passed');
