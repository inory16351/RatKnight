const { chromium } = require('C:/Users/asdzx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:720}});
    await page.route('https://fonts.googleapis.com/**', r => r.abort());
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.goto('http://localhost:5330/web/index.html', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => !!window.__game, null, {timeout:120000,polling:100});
    const results = await page.evaluate(() => {
      const g = window.__game, H = g.HBOX, out = [];
      const check = (name, value) => { if (!value) throw new Error(name); out.push(name); };
      const box = H.rect(10, 20, 10, 20);
      check('body edge overlap, not center sampling', H.touches(H.rect(0,12,0,12), box));
      check('separated rectangles miss', !H.touches(H.rect(0,9,0,9), box));
      check('fast capsule crosses target between frames', H.touches(H.line(-40,15,50,15,4), box));
      check('capsule near miss', !H.touches(H.line(-40,5,50,5,4), box));
      check('circle grazes body edge', H.touches(H.area(8,15,3), box));
      check('ring center is safe', !H.touches(H.ring(15,15,50,6), box));
      check('wedge front hits, back misses', H.touches(H.wedge(0,15,30,0,.4),box) && !H.touches(H.wedge(35,15,30,0,.4),box));
      g.loadRoom(0); g.P.x=500; g.P.y=600; g.P.inv=0; g.P.hp=5; g.P.ground=true; g.D.x=-9999;
      const e=g.spawnFoe({type:'crawler',x:700}); g.E.splice(0,g.E.length,e);
      g.startAttack('slash1'); g.P.atk={...g.P.atk,range:[0,180],h:[-80,0]};
      check('player swing hits body even with center outside attack',g.tryHit());
      const hp=e.hp; g.tryHit(); check('one damage per attack id',e.hp===hp);
      e.x=1000; g.P.hit=false; check('player swing misses distant body',!g.tryHit(true));
      g.P.inv=0; g.P.state='move'; g.P.hp=5;
      check('enemy attack uses body collider',g.enemyAttack(H.rect(490,510,550,590),600));
      const ph=g.P.hp; g.enemyAttack(H.rect(490,510,550,590),600); check('invulnerability blocks repeated contacts',g.P.hp===ph);
      g.P.inv=0; g.P.hp=5; g.P.ground=false; g.P.y=520;
      check('jump avoids ground hazard',!g.enemyAttack(H.rect(480,520,593,603),500,true));
      g.loadRoom(3); const b=g.BOSS; b.state='idle'; g.P.x=500; g.P.y=600; g.P.inv=0; g.P.hp=5; g.P.ground=true;
      const hurt=b.hurtBoxes()[0];
      check('boss body is area collider',H.touches(H.rect(hurt.x0-5,hurt.x0+5,hurt.top+20,hurt.top+30),hurt));
      b.state='tongueStuck'; b.tongue.len=400; b.tongue.ang=0;
      check('boss tongue is continuous capsule',b.hurtBoxes()[1]?.kind==='line');
      b.state='idle'; b.tongue.len=0; b.puddles=[{x:500,t:0}]; b.update(.01);
      check('boss puddle generates attack collider and damages grounded player',b.cols.some(c=>c.kind==='rect') && g.P.hp===4);
      g.P.inv=0;g.P.hp=5;g.P.ground=false;g.P.y=500;b.puddles=[{x:500,t:0}];b.update(.01);
      check('boss puddle allows airborne dodge',g.P.hp===5);
      b.puddles=[];b.drops=[{x:450,y:470,vx:1000,vy:0}];g.P.ground=false;g.P.x=500;g.P.y=500;g.P.inv=0;b.update(.06);
      check('boss projectile sweeps between old and new positions',b.cols.some(c=>c.kind==='line') && g.P.hp===4);
      b.drops=[];b.puddles=[];b.waves=[];b.state='jumpDrop';b.pose.lift=10;b.x=500;g.P.x=500;g.P.y=600;g.P.ground=true;g.P.inv=0;g.P.hp=5;b.update(.01);
      check('boss landing generates crush collider',b.cols.some(c=>c.kind==='rect' && c.top===440) && g.P.hp===4);
      g.P.state='move';g.P.inv=0;g.P.hp=5;g.P.x=620;g.P.y=600;g.P.ground=true;b.waves=[{x:600,d:1,t:0}];b.update(.02);
      check('boss shockwave generates moving ground collider',b.cols.some(c=>c.kind==='rect') && g.P.hp===4);
      return out;
    });
    assert.equal(results.length,20);
    console.log(results.join('\n'));
    console.log(`${results.length} combat checks passed`);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
