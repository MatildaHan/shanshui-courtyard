async (page) => {
 const errors=[],remote=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,route=>{remote.push(route.request().url());return route.abort();});
 try {
  await page.goto('file:///D:/DesktopFile/game/shanshui-courtyard/dist/shanshui-courtyard-single.html');
  await page.waitForFunction(()=>window.__courtyard?.getState().explorer.character.loaded);
  await page.keyboard.down('w');
  await page.waitForFunction(()=>window.__courtyard.getState().explorer.character.clip==='Walk');
  await page.waitForFunction(()=>window.__courtyard.getState().explorer.position[2]<11.3,null,{timeout:12000});
  await page.keyboard.up('w');
  await page.getByRole('button',{name:'☾ 夜景',exact:true}).click();
  const state=await page.evaluate(()=>window.__courtyard.getState());
  if(state.explorer.position[2]>=11.3||state.mode!=='night')throw new Error('Offline interaction failed');
  if(errors.length||remote.length)throw new Error(JSON.stringify({errors,remote}));
  return {passed:['file:// launch','no HTTP requests','embedded GLB and textures','Walk animation','keyboard movement','night mode'],character:state.explorer.character,errors,remote};
 } finally {
  await page.keyboard.up('w');
  await page.unroute(/^https?:/);
  await page.goto('http://127.0.0.1:9729/');
 }
}
