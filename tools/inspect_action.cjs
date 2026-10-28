const { chromium } = require('C:/Users/asdzx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  page.on('pageerror', error => console.error(error.message));
  page.on('requestfailed', r => console.log('failed', r.url(), r.failure()?.errorText));
  page.on('console', msg => { if (msg.type() === 'error') console.log(msg.text()); });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('http://localhost:5330/web/index.html?rig=v4', {waitUntil:'domcontentloaded'});
  console.log('document loaded');
  await page.waitForFunction(() => !!window.__game, null, { timeout: 120000, polling: 100 });
  const action = process.argv[2] || 'slash3';
  const name = process.argv[3] || `${action}_before`;
  await page.evaluate(({action}) => {
    const g = window.__game;
    g.P.x = 500; g.D.x = -9999; g.startAttack(action); g.step(15);
    console.log(JSON.stringify(g.F.FX.streaks.map(s => s.pts)));
  }, {action});
  fs.mkdirSync('docs/shots', {recursive:true});
  fs.writeFileSync(`docs/shots/${name}_points.json`, JSON.stringify(await page.evaluate(() => window.__game.F.FX.streaks.map(s => s.pts)), null, 2));
  await page.evaluate(() => { const g = window.__game; g.loadRoom(0); g.P.state = 'move'; g.P.t = 0; });
  await page.evaluate(async ({action, name}) => {
    const g = window.__game;
    await g.film(name, () => { g.P.x = 500; g.P.inv = 0; g.D.x = -9999; g.startAttack(action); }, 18, 1 / 60, 1, [-270, -250, 620, 280]);
  }, {action, name});
  await page.evaluate(async () => {
    const g=window.__game;
    g.loadRoom(0);g.P.x=420;g.P.y=600;g.P.ground=true;g.P.vx=0;g.P.vy=0;g.P.state='move';g.P.t=0;g.P.inv=0;g.F.FX.parts=[];g.F.FX.texts=[];g.step(30);await g.stageShot('city_depth');
    await g.shot('urban_idle',[{pose:g.A.IDLE,label:'urban starting gear'}],4);
    g.loadRoom(3);g.P.x=420;g.P.state='move';g.P.t=0;g.F.FX.parts=[];g.F.FX.texts=[];g.step(1);await g.stageShot('sewer_depth');
    g.P.x=680;g.P.y=600;g.P.state='move';g.P.inv=1;g.opt.colliders=true;
    g.BOSS.state='idle';g.BOSS.puddles=[{x:730,t:0}];g.BOSS.waves=[{x:780,d:-1,t:0}];g.startAttack('slash1');g.step(8);await g.stageShot('combat_colliders');
  });
  await browser.close();
  console.log(`docs/shots/${name}.png`);
})().catch(error => { console.error(error); process.exitCode = 1; });
