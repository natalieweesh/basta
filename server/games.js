let games = [];

// map of room names to interval IDs
let pendingRemovals = {};

const addGame = (room, users, prevAnswers, prevLetters, scores) => {
  
  console.log('room', room)
  console.log('find anything?', games.find((game) => game.id == room))
  if (games.find((game) => game.id == room)) {
    console.log('already started game with id', room)
    return;
  }
  let newAnswers = [];
  let newScores = [];
  let scoreTab = [];
  for (let i=0; i < users.length; i++) {
    newAnswers.push(['', '', '', '', '']);
    newScores.push(0);
    scoreTab.push(0);
  }

  const newGame = {
    id: room,
    letter: 'A',
    answers: newAnswers,
    previousAnswers: prevAnswers || [],
    previousLetters: prevLetters || [],
    scores: scores || newScores,
    scoreTabulation: scoreTab,
    scored: false,
    finishedGame: false,
    currentRound: 0,
  }
  games.push(newGame)
  console.log('games', games);
  console.log('users', users)
  return games;
}

const restartGame = (room, users) => {
  const gameToRemove = games.findIndex((game) => game.id == room);
  console.log('game to remove', gameToRemove)
  if (gameToRemove === -1) {
    return
  }
  console.log('games length', games.length)
  games.splice(gameToRemove, 1);
  console.log('games length after', games.length)
  users.map((u) => {
    u.answerSubmitted = false;
  })
  return games;
}

const updateScore = (room, userIndex, score) => {
  let game = games.find((game) => game.id === room);
  game.scores[userIndex] = score;
}

const getGame = (id) => games.find((game) => game.id === id);

const changeLetter = (room, letter) => {
  let game = games.find((game) => game.id === room);
  game.letter = letter;
}

const updateAnswer = (room, userIndex, categoryIndex, text) => {
  let game = games.find((game) => game.id === room);
  game.answers[userIndex][categoryIndex] = text;
}

const endGame = (room, users) => {
  let game = games.find((game) => game.id === room);
  game.finishedGame = true;
  if (game.scored) {
    return;
  }
  users.map((u, i) => {
    for (let k=0; k < 5; k++) {
      let noPoints = false;
      let halfPoints = false;
      let fullPoints = false;
      for (let j=0; j < users.length; j++) {
        if (j === i || game.answers[i][k].trim() === '' || game.answers[i][k].trim()[0].toLowerCase() !== game.letter.toLowerCase()) {
          noPoints = true;
          continue;
        }
        if (game.answers[i][k].trim().toLowerCase() === game.answers[j][k].trim().toLowerCase()) {
          halfPoints = true;
          fullPoints = false;
          continue;
        } else {
          fullPoints = true;
        }
      }
      if (halfPoints) {
        game.scoreTabulation[i] = parseInt(game.scoreTabulation[i]) + 5;
      } else if (fullPoints) {
        game.scoreTabulation[i] = parseInt(game.scoreTabulation[i]) + 10;
      }
    }
  })
  game.scored = true;
  return game;
}

const removeGame = (room) => {
  const index = games.findIndex((game) => game.id === room);

  if (index !== -1) {
    console.log('games before deleting', games)
    games.splice(index, 1)[0];
    console.log('games after deleting', games)
  }
}

const scheduleRemoveGame = (room, getUsersInRoom) => {
  let intervalId = setInterval(() => {
    console.log('deleting this room', room);
    const index = games.findIndex((game) => game.id === room);

    if (index !== -1) {
      const users = getUsersInRoom(room)
      if (users.length > 0) {
        console.log('there are still users in the room so do not delete it')
        return;
      } else {
        //delete the room for real
        console.log('games before deleting', games)
        games.splice(index, 1)[0];
        let intervalToStop = pendingRemovals[room];
        if (intervalToStop) {
          clearInterval(intervalToStop);
          delete pendingRemovals[room];
        }
        console.log('games after deleting', games)
      }
    }

  }, 5400000) // check 1.5 hours
  pendingRemovals[room] = intervalId;
}

module.exports = { addGame, getGame, restartGame, removeGame, scheduleRemoveGame, endGame, changeLetter, updateAnswer, updateScore };