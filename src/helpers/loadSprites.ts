import spritesInterface from "../../interfaces/spritesInterface";

const sprites: spritesInterface = {
    p4: new Image(70, 73),
    water: new Image(28, 46),
    enemy: new Image(90, 72)
};
sprites.p4.src = "./assets/sprites/player.png";
sprites.water.src = "./assets/sprites/water.png";
sprites.enemy.src = "./assets/sprites/enemy.png";

export default sprites;