const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');
const { Room } = require('./game/class/room');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /

    if( req.method == 'GET' && req.url == '/')
    {
      let availableRooms = world.availableRoomsToString()
      let htmlPage = fs.readFileSync("./views/new-player.html", "utf-8")
      let responseBody = htmlPage
      .replace(/#{availableRooms}/g, `${availableRooms}`)
     

      res.statusCode = 200
      res.setHeader("Content-Type", "text/html")
      return res.end(responseBody)
    }
    // Phase 2: POST /player

    if(req.method == 'POST' && req.url == '/player'){
      console.log(req.body)
      let roomId = req.body.roomId
      let startingRoom =  world.rooms[req.body.roomId]
      player = new Player(req.body.name, startingRoom)
      

      // res.statusCode = 302 | 200
      res.setHeader("Location", `/rooms/${roomId}`)
      return res.end()
    }

    if (!player) {
      res.statusCode = 302;
      res.setHeader('Location', `/`);
      res.end();
      return;
    }

    // ****
    // Phase 3: GET /rooms/:roomId
    if(req.method == "GET" && req.url.startsWith(`/rooms/`) ){

      let roomUrl = req.url.split('/')
      let roomId = roomUrl[2]

      if(player.currentRoom.id !== Number(roomId)){
        res.statusCode = 302
        res.setHeader('Location', `/rooms/${player.currentRoom.id}`)
        res.end()
        return
      }

      if(roomUrl.length === 3){
        const room = world.rooms[roomId];

        let htmlPage = fs.readFileSync("./views/room.html", "utf-8")
        let responseBody = htmlPage

        .replace(/#{roomName}/g, `${room.name}`)
        .replace(/#{roomId}/g, `${room.id}`)
        .replace(/#{roomItems}/g, `${room.itemsToString()}`)
        .replace(/#{inventory}/g, `${player.inventoryToString()}`)
        .replace(/#{exits}/g, `${room.exitsToString()}`);

        res.statusCode = 200
        res.setHeader("Content-Type", "text/html")
        res.end(responseBody)
      }
    }
    
    // Phase 4: GET /rooms/:roomId/:direction

    if(req.method === 'GET' && req.url.startsWith('/rooms/') && req.url.split('/').length === 4){
      
      let roomUrl = req.url.split('/')
      let roomId = roomUrl[2]
      let direction = roomUrl[3]
      console.log(player.currentRoom)

      if(player.currentRoom.id !== Number(roomId)){
        res.statusCode = 302
        res.setHeader('Location', `/rooms/${player.currentRoom.id}`)
        res.end()
        return
      } 

      try {
        player.move(direction[0]);
        res.statusCode = 302;
        res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
        res.end();
        return;

      } catch (e) {
        res.statusCode = 302;
        res.setHeader('Location', `/rooms/${roomId}`);
        res.end();
        return;
      }
    }
   

 

    // Phase 5: POST /items/:itemId/:action
    if(req.method === "POST"&& req.url.startsWith("/items/") && req.url.split('/').length === 4){
      let itemUrl = req.url.split('/')
      let itemId = itemUrl[2]
      let action = itemUrl[3]

      
      try {
        switch(action) {
          case 'drop':
            player.dropItem(itemId);
            break;
          case 'eat':
            player.eatItem(itemId);
            break;
          case 'take':
            player.takeItem(itemId);
            break;
        }

        const direction = 'n' || 'e' || 'w' || 's' || null;

        res.statusCode = 302;
        res.setHeader('Location', `rooms/${player.currentRoom.id}/${direction}`);
        res.end();
        return;
      }

      catch (e){
        let htmlPage = fs.readFileSync('views/error.html', 'utf-8');

        const resBody = htmlPage
          .replace(/#{errorMessage}/g, e.message)
          .replace(/#{roomId}/g, player.currentRoom.id);

          res.statusCode = 302;
          res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
        res.end(resBody);
        return;
      }
      
    }

    // Phase 6: Redirect if no matching route handlers
    res.statusCode = 404;
    res.end("Page Not Found");
    return;
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));
