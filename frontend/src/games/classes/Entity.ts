// import IEntity from "../interfaces/IEntity";
// import P4 from "../p4-Vega/classes/P4";

// import * as PIXI from 'pixi.js';

// // Class definition extending PIXI.Spritesheet
// export class LoadSpritesheet extends PIXI.Spritesheet {
//     private static instances: Map<string, PIXI.Spritesheet> = new Map();

//     // Static method to load and parse spritesheet assets
//     static async loadSpritesheet(app: Application, texturePath: string, dataPath: string): Promise<PIXI.Spritesheet> {
//         return new Promise((resolve, reject) => {
//             if (this.instances.has(texturePath)) {
//                 resolve(this.instances.get(texturePath));
//             } else {
//                 app.loader
//                     .add('texture', texturePath)
//                     .add('data', dataPath)
//                     .load((loader, resources) => {
//                         const spritesheet = new PIXI.Spritesheet(
//                             resources.texture.texture,
//                             resources.data.data
//                         );
//                         spritesheet.parse(() => {
//                             this.instances.set(texturePath, spritesheet);
//                             resolve(spritesheet);
//                         });
//                     });
//             }
//         });
//     }

//     // Constructor accepts paths and initializes spritesheet using already loaded assets
//     constructor(app: Application, texturePath: string, dataPath: string) {
//         const instance = AdvancedSpritesheet.instances.get(texturePath);
//         if (!instance) {
//             throw new Error('Spritesheet not loaded, please call loadSpritesheet first');
//         }
//         super(instance.baseTexture, instance.data);
//         // Ensure the spritesheet is preloaded
//         AdvancedSpritesheet.loadSpritesheet(app, texturePath, dataPath).then((loadedSpritesheet) => {
//             console.log('Spritesheet is ready to use:', loadedSpritesheet);
//         }).catch((error) => {
//             console.error('Error loading spritesheet:', error);
//         });
//     }
// }
