const logger = require("./logger");

class Cache {
  
  constructor(client, ttl = 60) {
    this.client = client;
    this.store = { boxes: [], expiry: 0 };
    this.ttl = ttl;
    this.fetchPending = false;
    this.isDebug = process.argv.includes('-v');
  }
  
  async fetchBoxes() {
    this.fetchPending = true;
    const request = await this.client('api/running-instances', { responseType: 'json' });
    if(this.isDebug) logger.log(`[fetchBoxes] ${request.statusCode}`);

    if(!Array.isArray(request.body)) {
      logger.error('Failed fetching box data');
      return false;
    }
    
    this.fetchPending = false;
    this.store.boxes = request.body;
    this.store.expiry = +new Date + (this.ttl * 1000);
    return true;
  }

  findBox(boxName) {
    return this.store.boxes.find(box => box.roomId.toLowerCase() === boxName.toLowerCase())
  }

  async getBox(boxName) {
    if(+new Date > this.store.expiry && !this.fetchPending) {
      if(this.isDebug) logger.log(`fetching boxes because ${+new Date} > ${this.store.expiry}`)
      await this.fetchBoxes();
    }

    return this.findBox(boxName);
  }

}

module.exports = Cache;
