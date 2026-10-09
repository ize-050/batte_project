// One engine source for browser and server. No user input is evaluated here.
const fs = require('node:fs');
const path = require('node:path');
module.exports = function engineSource() {
  const base = fs.readFileSync(path.join(__dirname, 'forest-rts-v2-backup.html'), 'utf8');
  return base.split('// ENGINE-BEGIN')[1].split('// ENGINE-END')[0]
    .replace('this.clusters=[', 'this.clusters=[{x:180,y:120,r:70},{x:530,y:105,r:75},{x:910,y:280,r:105},{x:870,y:730,r:90},{x:240,y:820,r:105},')
    .replace('this.move(u,u.dest,dt)&&u.team!==this.player', 'this.move(u,u.dest,dt)&&u.team!==this.player&&!this.multiplayer')
    .replace('(u.team!==this.player||this.visibleAt(u.target))', '(this.observable?this.observable(u.team,u.target):(u.team!==this.player||this.visibleAt(u.target)))')
    + '\n' + fs.readFileSync(path.join(__dirname, 'src/economy.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'src/expedition.js'), 'utf8');
};
