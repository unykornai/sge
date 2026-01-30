import fs from 'fs';
import path from 'path';
import logger from './logger';
import { DB_PATH } from './config';

const file = path.resolve(process.cwd(), DB_PATH || 'relayer-store.json');
let store: Record<string, { type: string; created_at: number }> = {};

try{
  if(fs.existsSync(file)){
    store = JSON.parse(fs.readFileSync(file, 'utf-8'));
  }else{
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
  }
}catch(e:any){
  logger.error('store init error', e?.toString?.() ?? String(e));
}

function persist(){
  try{
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
  }catch(e:any){
    logger.error('store persist error', e?.toString?.() ?? String(e));
  }
}

export function markProcessed(id: string, type = 'job'){
  if(store[id]) return false;
  store[id] = { type, created_at: Date.now() };
  persist();
  return true;
}

export function isProcessed(id: string){
  return !!store[id];
}

export default store;
