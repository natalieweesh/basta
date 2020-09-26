hello! this is the game [Basta!](https://www.spanishplayground.net/basta-game-spanish-vocabulary/)

<img src="https://media.giphy.com/media/pUK77wG1oHvEh916eC/giphy.gif" alt="basta game"/>

## to run the frontend

from the `client` directory run `npm start`

make sure if you want to connect to the backend locally you change the `ENDPOINT` variable in client/src/components/Game/Game.js

## to run the backend

from the `server` directory run `npm start`

## to deploy the frontend

run `npm run build`

then copy the `_redirects` file to the `build` folder

then run `netlify deploy` and give `./build` for the folder name when it asks for it

similarly run `netlify deploy --prod` with `./build`

## to deploy the backend

from the `server/` directory commit the code and do `git push heroku master`
