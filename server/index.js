const express = require('express');
// const Sentry = require('@sentry/node');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');

const { addUser, getUser, getUsersInRoom, setReadyToPlay, setReadyToRestart, setAllNotReadyToRestart, checkAllReadyToPlay, checkAllReadyToRestart, scheduleRemoveUser } = require('./users.js');
const { addGame, getGame, restartGame, removeGame, scheduleRemoveGame, endGame, changeLetter, updateAnswer, updateScore } = require('./games.js');

const PORT = process.env.PORT || 5000;

const router = require('./router');
const { ENGINE_METHOD_PKEY_ASN1_METHS } = require('constants');

const app = express();

// Sentry.init({ dsn: 'https://e056aabec1b343c58f3b1ce6ee82ca89@o422420.ingest.sentry.io/5348508' });

// The request handler must be the first middleware on the app
// app.use(Sentry.Handlers.requestHandler());


const server = http.createServer(app);
const io = socketio(server);

const corsOptions = {
  origin: 'http://draw.nataliewee.com',
  optionsSuccessStatus: 200
}
app.options('*', cors())
app.use(cors(corsOptions));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

 if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Max-Age', 120);
    return res.status(200).json({});
  }

  next();

});
app.use(router);
app.get("/status", (req, res) => {
  res.status(200).send({
    success: true
  })
})
// app.get('/debug-sentry', function mainHandler(req, res) {
//   throw new Error('My first Sentry error!');
// });

// app.use(Sentry.Handlers.errorHandler({
//   shouldHandleError(error) {
//     if (error.status >= 400 && error.status < 600) {
//       return true
//     }
//     return false
//   }
// }));


io.on('connection', (socket) => {
  console.log('We have a new connection!!');
  
  socket.on('join', ({ name, room }, callback) => {
    try {
      console.log(`adding user with socket id: ${socket.id} name: ${name}, room: ${room}`)
      const { error, user } = addUser({ id: socket.id, name, room });

      if (error) return callback(error);

      socket.emit('message', { user: 'admin', message: `${user.name}, welcome to the room ${user.room}`, messages: [] });
      socket.broadcast.to(user.room).emit('message', { user: 'admin', message: `${user.name} has joined!` });

      socket.join(user.room);

      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })

      callback();
    } catch (e) {
      console.log('error in join socket', e)
    }
  });

  socket.on('changeLetter', ({letter}, callback) => {
    try {
      const user = getUser(socket.id);
      changeLetter(user.room, letter);
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) });
      callback();
    } catch (e) {
      console.log('error in changeLetter', e);
    }
  })

  socket.on('updateAnswer', ({userIndex, categoryIndex, text}, callback) => {
    try {
      const user = getUser(socket.id);
      updateAnswer(user.room, userIndex, categoryIndex, text);
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) });
    } catch (e) {
      console.log('error in updateAnswer', e);
    }
  })

  socket.on('endGame', (callback) => {
    try {
      const user = getUser(socket.id);
      endGame(user.room, getUsersInRoom(user.room));
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) });
    } catch (e) {
      console.log('error in endGame', e);
    }
  })

  socket.on('setReadyToPlay', (callback) => {
    try {
      const user = getUser(socket.id);
      setReadyToPlay(socket.id);

      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

      //check if all users in room have set ready to play
      if (checkAllReadyToPlay(user.room)) {
        io.to(user.room).emit('startGame', { room: user.room, users: getUsersInRoom(user.room) });
      }

      callback();
    } catch (e) {
      console.log('error in setReadyToPlay socket', e)
    }
  })

  socket.on('setReadyToRestart', (callback) => {
    try {
      const user = getUser(socket.id);
      setReadyToRestart(socket.id);

      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

      //check if all users in room have set ready to restart
      if (checkAllReadyToRestart(user.room)) {
        let prevGame = getGame(user.room);
        let prevAnswers = prevGame.previousAnswers.push(prevGame.answers);
        let prevLetters = prevGame.previousLetters.push(prevGame.letter);
        restartGame(user.room, getUsersInRoom(user.room));
        const games = addGame(user.room, getUsersInRoom(user.room), prevGame.previousAnswers, prevGame.previousLetters, prevGame.scores)
        let currentGame = getGame(user.room);
        io.to(user.room).emit('gameRestarted', {room: user.room, users: getUsersInRoom(user.room)})
        setAllNotReadyToRestart(user.room);
        if (!!games) {
          io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
          io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
        }
      }

      callback();

    } catch (e) {
      console.log('error in setReadyToRestart socket', e)
    }
  })

  socket.on('updateScore', ({userId, score}, callback) => {
    try {
      const user = getUser(socket.id);
      updateScore(user.room, userId, score);
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
    } catch (e) {
      console.log('error in updateScore socket', e)
    }
  })

  socket.on('initiateGame', (callback) => {
    try {
      const user = getUser(socket.id);
      const games = addGame(user.room, getUsersInRoom(user.room));
      let currentGame = getGame(user.room);
      scheduleRemoveGame(user.room, getUsersInRoom)
      if (!!games) {
        callback();
      }
    } catch (e) {
      console.log('error in initiateGame socket', e)
    }
  })

  socket.on('restartGame', (callback) => {
    try {
      const user = getUser(socket.id);
      restartGame(user.room, getUsersInRoom(user.room));
      const games = addGame(user.room, getUsersInRoom(user.room))
      io.to(user.room).emit('gameRestarted', {room: user.room, users: getUsersInRoom(user.room)})
      if (!!games) {
        callback();
      }
    } catch (e) {
      console.log('error in restartGame socket', e)
    }
  })

  socket.on('fetchGame', (callback) => {
    try {
      const user = getUser(socket.id)

      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })

      callback();
    } catch (e) {
      console.log('error in fetchGame socket', e)
    }
  })

  socket.on('disconnect', ({messages}, callback) => {
    try {
      const user = scheduleRemoveUser(socket.id);

      if (user) {
        console.log('disconnect user', user.name, socket.id)
        if (getUsersInRoom(user.room).length === 0) { //there is a room and you are the only user left
          console.log('remove the last user from the room')
          removeGame(user.room)
        } else {
          console.log('there are still ppl in the room', user.name, user.room)
          io.to(user.room).emit('message', {user: 'admin', message: `${user.name} has left`, messages: messages})
        }
      }
    } catch (e) {
      console.log('error in disconnect socket', e)
    }
  });

  socket.on('frontEndReconnect', ({name, room}, callback) => {
    try {
      console.log('try to reconnect from the front end now!', name, room)
    } catch (e) {
      console.log('error in frontEndReconnect socket', e)
    }
  })

  socket.on('reconnect', () => {
    try {
      console.log('reconnect now!', socket.id)
    } catch (e) {
      console.log('error in reconnect socket', e)
    }
  })
})

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
