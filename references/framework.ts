import { AdvancedBloomFilter } from '@pixi/filter-advanced-bloom';
import { GlitchFilter } from '@pixi/filter-glitch';
import { OutlineFilter } from '@pixi/filter-outline';
import { AlphaFilter, BLEND_MODES, ColorMatrixFilter, Filter, Graphics, Rectangle, isMobile } from 'pixi.js';
import {
   content,
   context,
   convolver,
   effectSetup,
   filters,
   inventories,
   music,
   musicConvolver,
   musicFilter,
   musicMixer,
   musicRegistry,
   shaders,
   soundDelay,
   soundMixer,
   soundRegistry,
   soundRouter,
   sounds
} from './assets';
import {
   atlas,
   backend,
   events,
   exit,
   fullscreen,
   game,
   items,
   keys,
   maps,
   param,
   reload,
   reload_full,
   renderer,
   rng,
   rooms,
   spawn,
   speech,
   typer
} from './core';
import {
   OutertaleBox,
   OutertaleChoice,
   OutertaleGroup,
   OutertaleLayerKey,
   OutertaleMap,
   OutertaleOpponent,
   OutertaleRoom,
   OutertaleRoomDecorator,
   OutertaleShop,
   OutertaleSpeechPreset,
   OutertaleStat,
   OutertaleTurnState,
   OutertaleVolatile,
   OutertaleWeapon
} from './outertale';
import { SAVE } from './save';
import {
   CosmosAnimation,
   CosmosAnimationResources,
   CosmosAsset,
   CosmosAtlas,
   CosmosBaseEvents,
   CosmosCache,
   CosmosCharacter,
   CosmosCharacterPreset,
   CosmosCharacterProperties,
   CosmosColor,
   CosmosDaemon,
   CosmosDirection,
   CosmosEffect,
   CosmosEntity,
   CosmosHitbox,
   CosmosImage,
   CosmosImageUtils,
   CosmosInstance,
   CosmosInventory,
   CosmosKeyboardInput,
   CosmosKeyed,
   CosmosMath,
   CosmosNavigator,
   CosmosNot,
   CosmosObject,
   CosmosPlayer,
   CosmosPoint,
   CosmosPointSimple,
   CosmosProvider,
   CosmosRectangle,
   CosmosRegion,
   CosmosRegistry,
   CosmosRenderer,
   CosmosSizedObjectProperties,
   CosmosSprite,
   CosmosText,
   CosmosTextProperties,
   CosmosTextUtils,
   CosmosTyper,
   CosmosUtils,
   CosmosValue,
   CosmosValueRandom
} from './storyteller';
import text from './text';
import { translator } from './translator';

export const sonic = { random: null as CosmosValueRandom | null };
// export const namerangeGen = () => text.menu.name5.flat()
let nametmp = text.menu.name5.flat();
export const namerangeGen = () => nametmp;

export const clipFilter = new Filter(shaders.clipper.vert, shaders.clipper.frag, {
   minX: 0,
   medX: 320,
   maxX: 640,
   minY: 0,
   medY: 240,
   maxY: 480
});

export const mechanics = {
   /** atttack padding value (added to base attack) */
   base_at: 10,
   /** atttack padding value (with tem armor) */
   base_at_temy: 20,
   /** base player inv time in frames */
   base_inv: 30,
   /** base player soul speed */
   base_speed: 2,
   /** defense stat multiplier to compute damage reduction */
   df_multiplier: 0.2,
   /** LV exp thresholds */
   levels: [ 10, 30, 70, 120, 200, 300, 500, 800, 1200, 1700, 2500, 3500, 5000, 7000, 10000, 15000, 25000, 50000, 65535 ],
   /** twinkly's post repeated neutral effects on monster attack (default: reduce damage by 3) */
   noot_factor_at: 3,
   /** twinkly's post neutral effects on monster defense (default: take 1.5x damage) */
   noot_factor_df: 1.5,
   /** base attack stat override */
   overrideAT: null as CosmosProvider<number> | null,
   /** override bonus HP from sleeping */
   overrideBonusHP: null as CosmosProvider<number> | null,
   /** base defense stat override */
   overrideDF: null as CosmosProvider<number> | null,
   /** max HP override */
   overrideHP: null as CosmosProvider<number> | null,
   /** values for the fight button aim system */
   span: { min: 3, base: 22, range: 138 }
};

export const battler = {
   activate_ability () {
      switch (battler.SOUL.metadata.color) {
         case 'cyan':
         case 'cyangreen':
            if (
               !battler.SOUL.metadata.cyanLeap &&
               (battler.shadow.position.x !== battler.SOUL.position.x ||
                  battler.shadow.position.y !== battler.SOUL.position.y)
            ) {
               battler.SOUL.metadata.cyanLeap = true;
               battler.SOUL.metadata.cyanLeapTick = 0;
            }
            return true;
         case 'yellow':
            if (battler.SOUL.metadata.shot_tick === 0) {
               battler.SOUL.metadata.shot_tick = 4;
            }
            return true;
         case 'orange':
            if (battler.SOUL.metadata.orangeTick === 0) {
               battler.SOUL.metadata.orangeTick = 15;
               battler.SOUL.metadata.orangeFactors.push(60);
            }
            return true;
      }
   },
   /** in battle screen */
   active: false,
   /** nomore act keys! */
   acts: new CosmosRegistry<string, string>(''),
   // add opponent to battler
   add (opponent: OutertaleOpponent, position: CosmosPointSimple) {
      const volatile = {
         alive: true,
         container: new CosmosObject({ position }) as CosmosObject & {
            objects: CosmosSprite[];
         },
         flirted: false,
         opponent,
         hp: opponent.hp,
         sparable: opponent.sparable || false,
         vars: {}
      };
      volatile.container.attach(opponent.sprite(volatile));
      battler.volatile.push(volatile);
      battler.overlay.attach(volatile.container);
      return battler.volatile.length - 1;
   },
   // only the active volatile states
   get alive () {
      return battler.volatile.filter(value => value.alive);
   },
   // alpha of battler menus
   alpha: new CosmosValue(1),
   /** whether the assist option is present */
   assist: false,
   // extra attack points
   at: -2,
   get at_bonus () {
      const base = calcAT();
      return base < 9 ? 4 : base < 14 ? 3 : base < 17 ? 2 : base < 19 ? 1 : 0;
   },
   // garbo func
   async attack (
      volatile: OutertaleVolatile,
      {
         // item to use
         item = SAVE.data.s.weapon,
         // attack power
         power = 0,
         // operation to use
         operation = 'calculate' as 'add' | 'multiply' | 'calculate' | 'none',
         // multiplier
         multiplier = 1
      },
      noEffects = false,
      noVictory = false,
      noSFX = false
   ) {
      const info = volatile.opponent;

      // damage calculation
      const startHP = volatile.hp;
      switch (operation) {
         case 'calculate':
            volatile.hp -= battler.calculate(volatile, power, multiplier, item);
            break;
         case 'add':
            volatile.hp += power;
            break;
         case 'multiply':
            volatile.hp *= power;
            break;
      }

      // normalize hp
      const trueDamage = startHP - volatile.hp;
      volatile.hp < 0 && (volatile.hp = 0);
      if (volatile.hp === 0) {
         events.fire('fatal', volatile);
      }

      // sprite calculation
      const next = info.goodbye?.(volatile) || volatile.container.objects[0];
      const half = new CosmosPoint((next.metadata.size as CosmosPointSimple) || next.compute()).divide(2);
      const base = volatile.container.position.add(next.position.subtract(half.add(half.multiply(next.anchor))));
      const prev = volatile.container.objects[0];

      // damage indicator
      const barsize = Math.max(half.x * next.scale.x * 2, 60) * 1.25;
      const healthbar = new CosmosRectangle({
         anchor: 0,
         position: base.add(half.x, -7).clamp({ x: 1 + barsize / 2, y: 25 }, { x: 319 - barsize / 2, y: 215 }),
         stroke: '#000',
         fill: '#404040',
         size: { y: 7.5, x: barsize },
         border: 0.5
      });
      const sz = startHP / info.hp;
      const ez = volatile.hp / info.hp;
      const healthbarFill = new CosmosRectangle({
         anchor: { y: 0 },
         position: { x: barsize / -2 + 0.25 },
         fill: '#0f0',
         stroke: '',
         size: { y: 7, x: Math.ceil((barsize - 0.5) * (Number.isNaN(sz) ? 1 : sz) * 2) / 2 }
      });
      const dmgtext = Math.round(info.ghost ? 0 : trueDamage).toString();
      const indicator = new CosmosHitbox({
         position: { x: (dmgtext.length * 14 + (dmgtext.length - 1)) / -2 },
         objects: dmgtext.split('').map((value, index) => {
            const anim = new CosmosAnimation({
               anchor: { y: 1 },
               scale: 0.5,
               position: { x: index * 15, y: -3.875 - 0.5 },
               resources: content.ibuIndicator,
               tint: 0xff0000
            });
            anim.index = +value;
            return anim;
         })
      });
      healthbar.attach(healthbarFill, indicator);

      // strike animations
      volatile.container.objects[0] = next;
      renderer.attach('menu', healthbar);
      indicator.position.modulate(renderer, 850, { y: -20 }, { y: -20 }, { y: 2 }).then(() => {
         indicator.position.modulate(renderer, 100, {}, { y: 0 });
      });
      healthbarFill.size.modulate(renderer, 400, {
         x: Math.floor((barsize - 0.5) * (Number.isNaN(ez) ? 1 : ez) * 2) / 2
      });

      // strike sfx
      if (info.ghost || trueDamage === 0) {
         await renderer.pause(1000);
      } else {
         const dramatic = info.dramatic && volatile.hp === 0;
         noSFX || sounds.strike.instance(renderer);
         info.hurt && renderer.pause(250).then(() => info.hurt!.instance(renderer));
         let index = dramatic ? 15 : 30;
         const origin = next.position.x;
         while (index-- > 0) {
            if (index > 0 && !info.metadata.noShake) {
               next.position.x =
                  origin + Math.floor(index / 3) * (Math.floor((index % 4) / 2) * 2 - 1) * (dramatic ? 2 : 1);
            } else {
               next.position.x = origin;
            }
            dramatic ? await renderer.pause(200) : await renderer.on('tick');
         }
      }

      // end animations
      renderer.detach('menu', healthbar);

      // death check
      if (volatile.hp === 0) {
         // de-activate opponent
         volatile.alive = false;

         // g reward
         battler.g += volatile.opponent.g * 2;

         // your EXP increased, punk
         battler.exp += info.exp;

         // vaporization animation
         noEffects || (await battler.vaporize(next));

         // end battle?
         if (battler.alive.length === 0) {
            noVictory || events.fire('victory');
         }
         return true;
      } else {
         volatile.container.objects[0] = prev;
         return false;
      }
   },
   /** damage multiplier for next attack */
   attackMultiplier: 1,
   /** avert death screen */
   avert: false,
   // "fall" into battles
   async battlefall (player: CosmosPlayer, target = null as CosmosPointSimple | null) {
      battler.computeButtons();
      target ??= battler.buttons[world.archive ? 1 : 0].position.add(8, 11);
      let index = 0;
      const overlay = new CosmosRectangle({
         fill: '#000',
         size: 1000,
         priority: 999,
         metadata: { fade: false },
         anchor: 0
      }).on('tick', function () {
         this.metadata.fade || this.position.set(new CosmosPoint(game.camera).clamp(...renderer.region));
      });
      renderer.detach('main', player);
      renderer.attach('above', overlay, player);
      renderer.attach('menu', battler.SOUL);
      player.priority.value = 1000;
      battler.SOUL.alpha.value = 1;
      const posTicker = async () => {
         battler.SOUL.position.set(renderer.projection(player.position.subtract(0, 15)));
      };
      battler.SOUL.on('pre-render', posTicker);
      while (index++ !== 3) {
         sounds.noise.instance(renderer);
         if (index !== 3) {
            await renderer.pause(66);
            battler.SOUL.alpha.value = 0;
            await renderer.pause(66);
            battler.SOUL.alpha.value = 1;
         }
      }
      renderer.detach('above', player);
      player.priority.value = 0;
      sounds.battlefall.instance(renderer);
      battler.SOUL.off('pre-render', posTicker);
      await battler.SOUL.position.modulate(renderer, 600, target);
      events.on('battle').then(() => {
         renderer.detach('above', overlay);
         overlay.objects = [];
         overlay.position.set(160, 120);
         renderer.attach('menu', overlay);
         overlay.metadata.fade = true;
         overlay.alpha.modulate(renderer, 600, 0).then(() => {
            renderer.detach('menu', overlay);
         });
         renderer.attach('main', player);
      });
   },
   get bonus () {
      return SAVE.data.n.hp === Infinity ? 0 : Math.floor(Math.max(SAVE.data.n.hp - 11, 0) / 10);
   },
   box: new OutertaleBox({
      objects: [
         (() => {
            const graphics = new Graphics();
            const object = new CosmosObject().on('tick', function () {
               graphics.clear();
               if (battler.line.active) {
                  graphics.lineStyle({ color: 0x800080, alpha: 1, width: 1 });
                  this.position.y = battler.box.size.y / -2;
                  const offs = battler.line.offset;
                  battler.line.offset = (battler.line.offset + battler.line.loop + 20) % 20;
                  if (Math.abs(offs - battler.line.offset) > 10) {
                     battler.line.iterations++;
                  }
                  let index = 0;
                  const amount = battler.line.amount();
                  while (index < amount) {
                     const y = battler.line.offset + index++ * 20 - 0.5;
                     const w2 = battler.line.width / 2;
                     graphics.moveTo(-w2, y).lineTo(w2, y);
                  }
                  graphics.closePath();
               }
            });
            object.container.addChild(graphics);
            return object;
         })(),
         new CosmosObject({ area: renderer.area, filters: [ clipFilter ] }),
         new CosmosObject().on('tick', function () {
            if (battler.line.active && battler.line.sticky) {
               battler.SOUL.position.x += battler.box.position.x - battler.line.pos.x;
               battler.line.pos.x = battler.box.position.x;
            }
         })
      ]
   }).on('pre-render', function () {
      if (this.metadata.alpha === void 0) {
         this.alpha.value = battler.alpha.value;
      } else {
         this.alpha.value = this.metadata.alpha as number;
      }
      const truePos = this.position.multiply(2).add(renderer.layers.menu.container);
      const cfu = clipFilter.uniforms;
      cfu.minX = truePos.x - this.size.x + 1.25;
      cfu.medX = truePos.x;
      cfu.maxX = truePos.x + this.size.x - 1.25;
      cfu.minY = truePos.y - this.size.y + 1.25;
      cfu.medY = truePos.y;
      cfu.maxY = truePos.y + this.size.y - 1.25;
      cfu.rads = Math.PI - (((this.rotation.value + 90) % 360) * Math.PI) / 180;
      const inv = this.position.multiply(-1);
      this.objects[1].position.set(inv);
      this.objects[2].position.set(inv);
   }),
   bubbles: {
      dummy: (
         fontName = () => speech.state.fontName2,
         fontSize = () => speech.state.fontSize2,
         provider = () => game.text
      ) =>
         new CosmosObject({
            objects: [
               new CosmosSprite({ frames: [ content.ibuBubbleDummy ], scale: 0.5 }),
               new CosmosText({
                  fill: '#000',
                  position: { x: 10, y: 5 },
                  spacing: { x: -2 }
               }).on('tick', function () {
                  this.fontName = fontName();
                  this.fontSize = fontSize();
                  this.content = provider();
               })
            ]
         }),
      napstablook: (
         fontName = () => speech.state.fontName2,
         fontSize = () => speech.state.fontSize2,
         provider = () => game.text
      ) =>
         new CosmosObject({
            objects: [
               new CosmosSprite({ frames: [ content.ibuBubbleBlooky ], scale: 0.5 }),
               new CosmosText({
                  fill: '#000',
                  position: { x: 10, y: 5 }
               }).on('tick', function () {
                  this.fontName = fontName();
                  this.fontSize = fontSize();
                  this.content = provider();
                  switch (this.fontName) {
                     case 'Papyrus':
                        this.spacing.x = 0;
                        this.spacing.y = 0;
                        break;
                     case 'ComicSans':
                        this.spacing.x = 0;
                        this.spacing.y = 1;
                        break;
                     default:
                        this.spacing.x = -2;
                        this.spacing.y = 0;
                        break;
                  }
               })
            ]
         }),
      napstablook2: (
         fontName = () => speech.state.fontName2,
         fontSize = () => speech.state.fontSize2,
         provider = () => game.text
      ) =>
         new CosmosObject({
            objects: [
               new CosmosSprite({ anchor: { x: 1 }, frames: [ content.ibuBubbleBlooky ], scale: { x: -0.5, y: 0.5 } }),
               new CosmosText({
                  fill: '#000',
                  position: { x: 6, y: 5 }
               }).on('tick', function () {
                  this.fontName = fontName();
                  this.fontSize = fontSize();
                  this.content = provider();
                  switch (this.fontName) {
                     case 'Papyrus':
                        this.spacing.x = 0;
                        this.spacing.y = 0;
                        break;
                     case 'ComicSans':
                        this.spacing.x = 0;
                        this.spacing.y = 1;
                        break;
                     default:
                        this.spacing.x = -2;
                        this.spacing.y = 0;
                        break;
                  }
               })
            ]
         }),
      twinkly: (
         fontName = () => speech.state.fontName2,
         fontSize = () => speech.state.fontSize2,
         provider = () => game.text
      ) =>
         new CosmosObject({
            objects: [
               new CosmosSprite({ frames: [ content.ibuBubbleTwinkly ], scale: 0.5 }),
               new CosmosText({
                  fill: '#000',
                  position: { x: 11, y: 5 },
                  spacing: { x: -2 }
               }).on('tick', function () {
                  this.fontName = fontName();
                  this.fontSize = fontSize();
                  this.content = provider();
                  switch (this.fontName) {
                     case 'Papyrus':
                        this.spacing.x = 0;
                        this.spacing.y = 0;
                        break;
                     case 'ComicSans':
                        this.spacing.x = 0;
                        this.spacing.y = 1;
                        break;
                     default:
                        this.spacing.x = -2;
                        this.spacing.y = 0;
                        break;
                  }
               })
            ]
         }),
      twinkly2: (
         fontName = () => speech.state.fontName2,
         fontSize = () => speech.state.fontSize2,
         provider = () => game.text
      ) =>
         new CosmosObject({
            objects: [
               new CosmosSprite({ frames: [ content.ibuBubbleTwinkly ], scale: { x: -0.5, y: 0.5 } }),
               new CosmosText({
                  fill: '#000',
                  position: { x: -103, y: 5 }
               }).on('tick', function () {
                  this.fontName = fontName();
                  this.fontSize = fontSize();
                  this.content = provider();
                  switch (this.fontName) {
                     case 'Papyrus':
                        this.spacing.x = 0;
                        this.spacing.y = 0;
                        break;
                     case 'ComicSans':
                        this.spacing.x = 0;
                        this.spacing.y = 1;
                        break;
                     default:
                        this.spacing.x = -2;
                        this.spacing.y = 0;
                        break;
                  }
               })
            ]
         }),
      mtt: (
         fontName = () => speech.state.fontName2,
         fontSize = () => speech.state.fontSize2,
         provider = () => game.text
      ) =>
         new CosmosObject({
            objects: [
               new CosmosSprite({ anchor: { x: 0 }, frames: [ content.ibuBubbleMTT ], scale: 0.5 }),
               new CosmosText({
                  fill: '#000',
                  position: { x: -39.5, y: 9.5 },
                  stroke: '',
                  spacing: { x: -2 }
               }).on('tick', function () {
                  this.fontName = fontName();
                  this.fontSize = fontSize();
                  this.content = provider();
               })
            ]
         }),
      mttphone: (
         fontName = () => speech.state.fontName2,
         fontSize = () => speech.state.fontSize2,
         provider = () => game.text
      ) =>
         new CosmosObject({
            objects: [
               new CosmosSprite({ anchor: { x: 0, y: 1 }, frames: [ content.ibuBubbleShock ], scale: 0.5 }),
               new CosmosText({
                  fill: '#fff',
                  position: { x: -47, y: -69 },
                  stroke: '',
                  spacing: { x: -2 }
               }).on('tick', function () {
                  this.fontName = fontName();
                  this.fontSize = fontSize();
                  this.content = provider();
               })
            ]
         })
   },
   // "in the box" bullet layer
   get bullets () {
      return battler.box.objects[1];
   },
   get bullied () {
      let hurt = null as boolean | null;
      return battler.alive.filter(
         volatile =>
            !volatile.sparable &&
            volatile.opponent.bullyable &&
            volatile.hp <= battler.calculate(volatile, 1) &&
            (volatile.hp < volatile.opponent.hp || (hurt ??= ateThreshold()))
      );
   },
   buttons: [
      new CosmosAnimation({
         metadata: { button: 'fight' },
         scale: 0.5,
         position: { x: 16, y: 432 / 2 },
         resources: content.ibuFight
      }),
      new CosmosAnimation({
         scale: 0.5,
         metadata: { button: 'act' },
         position: { x: 16 + 233 / 3, y: 432 / 2 },
         resources: content.ibuAct
      }),
      new CosmosAnimation({
         scale: 0.5,
         metadata: { button: 'item' },
         position: { x: 16 + 233 / 1.5, y: 432 / 2 },
         resources: content.ibuItem
      }),
      new CosmosAnimation({
         scale: 0.5,
         metadata: { button: 'mercy' },
         position: { x: 16 + 233, y: 432 / 2 },
         resources: content.ibuMercy
      })
   ],
   buttonState: 0,
   calculate (volatile: OutertaleVolatile, power: number, multiplier = 1, item = SAVE.data.s.weapon) {
      return multiplier === 0
         ? 0
         : Math.max(
              Math.round(
                 (calcATX(item) *
                    power *
                    (power < 1 - mechanics.span.min / mechanics.span.range ? 2 : battler.weapons.of(item).crit) *
                    battler.attackMultiplier -
                    (volatile.opponent.df + battler.stat.monsterdef.compute())) *
                    multiplier *
                    (world.postnoot && !volatile.opponent.metadata.nootexempt ? mechanics.noot_factor_df : 1)
              ),
              1
           );
   },
   async cleanup () {
      battler.at = -2;
      renderer.detach('menu', battler.SOUL);
      battler.dumpster();
      battler.active = false;
      await Promise.all(events.fire('battle-exit'));
      battler.instafade || renderer.alpha.modulate(renderer, 300, 1);
   },
   // boxclip filter
   clipFilter,
   computeButtons () {
      const bs = battler.buttonState;
      if (world.archive) {
         if (bs === -1) {
            return;
         } else {
            battler.buttonState = -1;
            battler.buttons[0].alpha.value = 0;
            battler.buttons[3].alpha.value = 1;
         }
      } else if (world.genocide) {
         if (bs === 1) {
            return;
         } else {
            battler.buttonState = 1;
            battler.buttons[0].alpha.value = 1;
            battler.buttons[3].alpha.value = 0;
         }
      } else if (bs === 0) {
         return;
      } else {
         battler.buttonState = 0;
         battler.buttons[0].alpha.value = 1;
         battler.buttons[3].alpha.value = 1;
      }
      for (const button of battler.buttons) {
         button.position.x += (233 / 6) * (battler.buttonState - bs);
      }
   },
   // deal damage to SOUL
   damage (damage: number, modifier = calcDFX(), hit = true, papyrus = false, bullet = new CosmosHitbox()) {
      // get final damage
      const finalDamage = Math.min(
         Math.max(
            damage +
               modifier +
               battler.stat.monsteratk.compute() +
               (SAVE.flag.n.neutral_repeat < 6 ? 0 : -mechanics.noot_factor_at),
            damage > 0 ? 1 : 0
         ),
         SAVE.data.n.hp
      );
      // reduce HP
      SAVE.data.n.hp -= finalDamage;
      battler.hpboost.magic += finalDamage;
      // increment hit counter
      hit && SAVE.data.n.hits++;
      // play sound effect
      sounds.hurt.instance(renderer);
      // screen shake
      shake(2, 300);
      // trigger event
      events.fire('hurt', bullet, finalDamage, papyrus);
      // correct for death bypass
      papyrus && SAVE.data.n.hp === 0 && (SAVE.data.n.hp = 1);
      // trigger death event if applicable, else check if bullet is standard
      if (SAVE.data.n.hp === 0) {
         battler.defeat();
      } else {
         // enable inv and set inv time
         battler.invulnerable = Math.round(battler.stat.invulnerability.compute());
         // begin animation
         battler.SOUL.metadata.spriteoverride === null && (battler.SOUL.objects[0] as CosmosAnimation).enable();
      }
   },
   // deadeye target
   deadeye: new CosmosSprite({ anchor: 0, position: 160, frames: [ content.ibuDeadeye ] }),
   // deadeye target properties
   deadeyeScale: { x: 273 / 194, y: 57 / 47 },
   // death screen
   async defeat () {
      if (!game.active) {
         return;
      }
      if (battler.avert) {
         battler.avert = false;
         return;
      }
      game.active = false;
      const d = SAVE.flag.n._deaths++;
      SAVE.flag.b._died = true;
      const deathAssets = new CosmosInventory(
         content.asShatter,
         content.avAsgore,
         content.ibuDefeat,
         content.ibuShatter
      );
      deathAssets.name = 'deathAssets';
      const queue1 = deathAssets.load();
      const queue2 = content.amGameover.load();
      renderer.canvas.remove();
      await renderer.pause(100);
      renderer.stop();
      soundMixer.input.disconnect();
      musicMixer.input.disconnect();
      const deathRenderer = new CosmosRenderer({
         auto: true,
         alpha: 1,
         wrapper: '#wrapper',
         layers: { main: [ 'fixed' ] },
         width: 640,
         height: 480,
         scale: 2
      });
      deathRenderer.on('tick', { priority: -Infinity, listener: gamepadder.update });
      if (isMobile.any) {
         deathRenderer.attach('main', mobile.gamepad());
         mobile.target = deathRenderer.canvas;
      }
      const position = battler.SOUL.position.clone();
      const SOUL = new CosmosAnimation({
         anchor: 0,
         resources: content.ibuSOUL,
         position,
         scale: 0.5
      });
      deathRenderer.attach('main', SOUL);
      await deathRenderer.pause(660);
      deathRenderer.detach('main', SOUL);
      const breakSOUL = new CosmosSprite({
         anchor: 0,
         frames: [ content.ibuBreak ],
         position,
         scale: 0.5
      });
      deathRenderer.attach('main', breakSOUL);
      new CosmosDaemon(content.asBreak, {
         context,
         gain: sounds.break.gain * soundMixer.value,
         rate: sounds.break.rate
      }).instance(deathRenderer);
      await Promise.all([ queue1, deathRenderer.pause(1330) ]);
      deathRenderer.detach('main', breakSOUL);
      const shards = CosmosUtils.populate(6, index =>
         new CosmosAnimation({
            active: true,
            anchor: 0,
            resources: content.ibuShatter,
            position: position.add(index * 2 - (index < 3 ? 7 : 3), (index % 3) * 3),
            scale: 0.5
         }).on(
            'tick',
            (() => {
               let gravity = 0;
               const direction = Math.random() * 360;
               return async function () {
                  this.position = this.position.endpoint(direction, 3.5).add(0, (gravity += 0.1));
                  if (this.position.y > 250) {
                     deathRenderer.detach('main', this);
                  }
               };
            })()
         )
      );
      deathRenderer.attach('main', ...shards);
      new CosmosDaemon(content.asShatter, {
         context,
         gain: sounds.shatter.gain * soundMixer.value,
         rate: sounds.shatter.rate
      }).instance(deathRenderer);
      await Promise.all([ queue2, deathRenderer.pause(650) ]);
      const gameover = new CosmosDaemon(content.amGameover, {
         context,
         loop: true,
         gain: 0.39 * musicMixer.value
      }).instance(deathRenderer);
      const defeat = new CosmosSprite({
         alpha: 0,
         frames: [ content.ibuDefeat ],
         position: { x: 114 / 2, y: 36 / 2 },
         scale: 0.5
      });
      deathRenderer.attach('main', defeat);
      defeat.alpha.modulate(deathRenderer, 1250, 1);
      await deathRenderer.pause(650);
      const backEnd = new CosmosText({
         fill: '#fff',
         position: { x: 160 / 2, y: 324 / 2 },
         stroke: '',
         priority: 1,
         fontName: 'DeterminationMono',
         fontSize: 16,
         spacing: { x: 1, y: 5 }
      });
      const voice = speech.presets.of('asgore').voices[0]![0];
      const deathTyper = new CosmosTyper({
         renderer: deathRenderer,
         interval: 4,
         sounds: [
            new CosmosDaemon(content.avAsgore, {
               context,
               gain: voice.gain * soundMixer.value,
               rate: voice.rate * 1.05
            })
         ]
      }).on('text', content => {
         backEnd.content = content;
      });
      deathRenderer.attach('main', backEnd);
      deathTyper.variables.name = SAVE.data.s.name || text.general.mystery2;
      deathTyper.variables.namel = (SAVE.data.s.name || text.general.mystery2).toLowerCase();
      deathTyper.variables.nameu = (SAVE.data.s.name || text.general.mystery2).toUpperCase();
      keys.interactKey.on('down', () => deathTyper.read());
      keys.specialKey.on('down', () => deathTyper.skip());
      await deathTyper.text(
         ...[ text.battle.death1, text.battle.death2, text.battle.death3, text.battle.death4, text.battle.death5 ][
            d === 0 ? 0 : rng.dialogue.int(5)
         ].map(line => `${d === 0 ? '<20>{*}' : '<20>'}${line}`)
      );
      deathRenderer.detach('main', backEnd);
      await Promise.all([
         gameover.gain.modulate(deathRenderer, 1250, 0).then(() => {
            gameover.stop();
            content.amGameover.unload();
         }),
         defeat.alpha.modulate(deathRenderer, 1250, 0)
      ]);
      await deathRenderer.pause(1000);
      reload(true);
      await new Promise(() => {});
   },
   async dumpster () {
      for (const [ holder, object ] of battler.garbage.splice(0, battler.garbage.length)) {
         if (typeof holder === 'string') {
            renderer.detach(holder, object);
         } else {
            holder.objects.splice(holder.objects.indexOf(object));
         }
      }
   },
   async encounter (
      player: CosmosPlayer,
      group: OutertaleGroup,
      notify = true,
      persistmusic = false,
      target = null as CosmosPointSimple | null
   ) {
      battler.encounter_state.movement = game.movement;
      game.movement = false;
      const loader = battler.load(group);
      const restoreLevel = game.music?.gain.value ?? 0;
      persistmusic || game.music?.stop();
      if (notify) {
         sounds.notify.instance(renderer);
         const notifier = new CosmosAnimation({
            anchor: { x: 0, y: 1 },
            resources: content.ibuNotify
         }).on('pre-render', function () {
            this.position.set(renderer.projection(player.position.subtract(0, 32)));
         });
         renderer.attach('menu', notifier);
         await renderer.pause(850);
         renderer.detach('menu', notifier);
      }
      await Promise.all([ loader, battler.battlefall(player, target) ]);
      const OGreverb = musicConvolver.value;
      const OGfilter = musicFilter.value;
      musicConvolver.value = 0;
      musicFilter.value = 0;
      await battler.start(group);
      game.movement = battler.encounter_state.movement;
      musicConvolver.value = OGreverb;
      musicFilter.value = OGfilter;
      persistmusic || (game.music && resume({ gain: restoreLevel, rate: game.music.rate.value }));
      battler.unload(group);
   },
   encounter_state: { movement: false },
   // accrued exp in battle
   exp: 0,
   // abc
   fakehp: null as string | null,
   // fight mode
   async fight () {
      battler.attackMultiplier = 1;
      battler.deadeye.alpha.modulate(renderer, 0, 1);
      battler.deadeye.scale.set(battler.deadeyeScale);
      battler.deadeye.scale.modulate(renderer, 0, battler.deadeyeScale);
      renderer.attach('menu', battler.deadeye);
      battler.SOUL.alpha.value = 0;
      battler.refocus();
      const weapon = battler.weapons.of(SAVE.data.s.weapon);
      let hit = false;
      let score = 0;
      let targetbar = 0;
      let delayoffset = 0;
      await Promise.all(
         CosmosUtils.populate(weapon.targets, async index => {
            const delay = delayoffset;
            delayoffset += (weapon.tdbase ?? 250) + rng.battle.next() * (weapon.tdspan ?? 100);
            await renderer.pause(delay);
            let miss = true;
            let critted = false;
            let canHit = true;
            const hitbar = new CosmosRectangle({
               fill: '#fff',
               stroke: '#000',
               anchor: 0,
               size: { x: (8 + 1.5) / 2, y: (124 + 1.5) / 2 },
               border: 1.5,
               position: { x: mechanics.span.base + (weapon.off ?? 0), y: 160 },
               velocity: {
                  x:
                     (SAVE.data.s.armor === 'temyarmor'
                        ? weapon.speed > 1
                           ? 1.5
                           : 3
                        : SAVE.data.s.armor === 'visor'
                        ? 3
                        : 6) * weapon.speed
               }
            });
            renderer.attach('menu', hitbar);
            await Promise.race([
               renderer
                  .when(() => index === targetbar)
                  .then(async () => {
                     await keys.interactKey.on('down');
                     if (canHit) {
                        hit = true;
                        miss = false;
                        const diff = Math.abs(hitbar.position.x - mechanics.span.base - mechanics.span.range);
                        critted = diff <= mechanics.span.min;
                        score += 1 - (critted ? 0 : Math.min(diff, mechanics.span.range) / mechanics.span.range);
                        hitbar.velocity.x = 0;
                        if (diff <= mechanics.span.min) {
                           hitbar.position.x = mechanics.span.base + mechanics.span.range;
                        }
                     }
                  }),
               renderer.when(() => mechanics.span.range * 2 <= hitbar.position.x - mechanics.span.base)
            ]);
            canHit = false;
            targetbar++;
            if (miss) {
               renderer.detach('menu', hitbar);
            } else {
               const vola = battler.target!;
               vola.opponent.safe || oops();
               events.fire('swing');

               // sprite calculation
               const container = vola.container;
               const next = vola.opponent.goodbye?.(vola) || container.objects[0];
               const half = new CosmosPoint((next.metadata.size as CosmosPointSimple) || next.compute()).divide(2);
               const base = container.position.add(next.position.subtract(half.add(half.multiply(next.anchor))));

               // handle weapon modes
               await weapon.animation(index, critted, score / (index + 1), base, half, hitbar, next);
               renderer.detach('menu', hitbar);
            }
         })
      );
      await renderer.pause(350);
      Promise.all([
         battler.deadeye.alpha.modulate(renderer, 500, 0, 0, 0),
         battler.deadeye.scale.modulate(renderer, 500, battler.deadeyeScale, battler.deadeyeScale, {
            x: 0,
            y: battler.deadeyeScale.y
         })
      ]).then(() => {
         renderer.detach('menu', battler.deadeye);
      });
      atlas.switch(null);
      atlas.detach(renderer, 'menu', 'battlerAdvancedText');

      if (hit) {
         events.fire('choice', { type: 'fight', score: score / weapon.targets });
      } else {
         events.fire('choice', { type: 'fake' });
      }
   },
   /** whether the flee option is present */
   flee: true,
   // accrued gold in battle
   g: 0,
   // garbage sprites (to be detached upon battle end)
   garbage: [] as [OutertaleLayerKey | CosmosObject, CosmosObject][],
   // normal swirl preset wow
   generic_magic: '{@swirl:0.75,-1.5,12}',
   // ghost swirl preset
   ghost_magic: '{@swirl:0.75,-1.2,15}',
   /** battler grid backdrop */
   get grid () {
      return battler.gridder.frames[0] ?? null;
   },
   set grid (value) {
      battler.gridder.frames[0] = value;
   },
   gridder: new CosmosSprite({
      position: { x: 15 / 2, y: 9 / 2 },
      scale: 0.5
   }).on('tick', function () {
      this.frames = [ battler.grid ];
      this.alpha.value = battler.alpha.value;
   }),
   groups: [] as OutertaleGroup[],
   hitbar1 (hitbar: CosmosRectangle) {
      let ticks = 0;
      let state = false;
      hitbar.on('tick', function () {
         if (ticks++ === 4) {
            if ((state = !state)) {
               hitbar.fill = '#000';
               hitbar.stroke = '#fff';
            } else {
               hitbar.fill = '#fff';
               hitbar.stroke = '#000';
            }
         }
      });
   },
   hitbar2 (hitbar: CosmosRectangle, critted: boolean) {
      if (critted) {
         let state = false;
         hitbar.on('tick', () => {
            if ((state = !state)) {
               hitbar.fill = hitbar.stroke = [ '#f0f', '#ff0', '#0ff' ][Math.floor(Math.random() * 3)];
            }
         });
         sounds.crit.instance(renderer);
      } else {
         hitbar.fill = hitbar.stroke = '#fff';
         sounds.multitarget.instance(renderer);
      }
      hitbar.alpha.modulate(renderer, 500, 0, 0);
      hitbar.scale.modulate(renderer, 500, { x: 2, y: 2 }, { x: 2, y: 2 });
   },
   hpboost: {
      direct: 0,
      magic: 0,
      calculateDM () {
         return Math.round(
            Math.max(battler.hpboost.direct, 0) +
               Math.max(battler.hpboost.magic, 0) *
                  ((SAVE.data.s.weapon === 'tablaphone' ? 1 / 4 : 0) + (SAVE.data.s.armor === 'temyarmor' ? 1 / 2 : 0))
         );
      },
      calculateHP (dm: number | null = null) {
         return Math.max(SAVE.data.n.hp, Math.min(SAVE.data.n.hp + (dm ?? battler.hpboost.calculateDM()), calcHP()));
      },
      reset () {
         battler.hpboost.direct = 0;
         battler.hpboost.magic = 0;
      }
   },
   async human (...lines: string[]) {
      const simple = atlas.target === 'battlerSimple';
      atlas.switch('battlerAdvancedText');
      atlas.attach(renderer, 'menu', 'battlerAdvancedText');
      await dialogue_primitive(...lines);
      atlas.switch(simple ? 'battlerSimple' : null);
   },
   get hurt () {
      return battler.alive.filter(
         volatile => volatile.hp < volatile.opponent.hp && volatile.hp <= battler.calculate(volatile, 1)
      );
   },
   async idle (volatile: OutertaleVolatile) {
      await Promise.all(
         battler.indexes.map(index => {
            const v = battler.volatile[index];
            if (v !== volatile) {
               return v.opponent.handler?.({ type: 'none' }, index, v);
            }
         })
      );
   },
   // only the active indexes
   get indexes () {
      const list = [] as number[];
      let i = 0;
      while (i !== battler.volatile.length) {
         if (battler.volatile[i].alive) {
            list.push(i);
         }
         i++;
      }
      return list;
   },
   // skip fading out of battle screen
   instafade: false,
   // invulnerable
   invulnerable: 0,
   // load battler assets
   async load (group: OutertaleGroup) {
      return Promise.all([
         inventories.battleAssets.load(),
         group.assets?.load(),
         ...[ ...new Set(group.opponents.map(opponent => opponent[0])) ].map(opponent => opponent.assets.load())
      ]);
   },
   // purple soul mode lines
   line: {
      active: false,
      amount () {
         return battler.line.amount_override ?? Math.floor(battler.box.size.y / 20);
      },
      amount_override: null as number | null,
      box_override: null as number | null,
      damage: 6,
      iterations: 0,
      offset: 12.5,
      loop: 0,
      sticky: true,
      swap: 0,
      swap_invuln: false,
      width: 100,
      pos: { x: 0, y: 0 },
      maxY: null as number | null,
      minY: null as number | null,
      reset () {
         battler.line.active = false;
         battler.line.damage = 6;
         battler.line.offset = 12.5;
         battler.line.loop = 0;
         battler.line.sticky = true;
         battler.line.swap = 0;
         battler.line.swap_invuln = false;
         battler.line.width = 100;
         battler.line.pos.x = 0;
         battler.line.pos.y = 0;
         battler.line.maxY = null;
         battler.line.minY = null;
      }
   },
   // gain love
   love () {
      const lv = calcLVX();
      SAVE.data.n.g += battler.g;
      SAVE.data.n.exp += battler.exp;
      if (calcLVX() > lv) {
         sounds.love.instance(renderer);
         return true;
      } else {
         return false;
      }
   },
   // monstertext
   async monster (
      cutscene: boolean,
      position: CosmosPointSimple,
      bubble: (fontName?: () => string, fontSize?: () => number, content?: () => string) => CosmosObject,
      ...lines: string[]
   ) {
      let fontName: () => string, fontSize: () => number, provider: () => string, typer_current: CosmosTyper;
      let targets = null as Set<CosmosSprite> | null;
      if (battler.multitext.active) {
         let text = '';
         const index = battler.multitext.targets.length;
         const typer_local = new CosmosTyper({ renderer });
         typer_local.variables = typer.variables;

         fontName = () => state.fontName2;
         fontSize = () => state.fontSize2;
         provider = () => text;
         typer_current = typer_local;
         targets = new Set<CosmosSprite>();
         battler.multitext.targets.push(targets);
         battler.multitext.typers.push(typer_local);

         const state = {
            face: null as CosmosSprite | null,
            get fontName1 () {
               return state.preset.fontName1;
            },
            get fontName2 () {
               return state.preset.fontName2;
            },
            get fontSize1 () {
               return state.preset.fontSize1;
            },
            get fontSize2 () {
               return state.preset.fontSize2;
            },
            preset: new OutertaleSpeechPreset()
         };

         typer_local.on('header', header => {
            const [ key, delimiter, ...args ] = header.split('');
            if (delimiter === '/') {
               const value = args.join('');
               switch (key) {
                  case 'e':
                     const [ identifier, emote ] = value.split('/');
                     identifier in speech.emoters && (speech.emoters[identifier].index = +emote);
                     break;
                  case 'f':
                     state.face = state.preset.faces[+value];
                     break;
                  case 'g':
                     state.face = portraits.of(value);
                     break;
                  case 'i':
                     if (value[0] === 'x') {
                        typer_local.interval = Math.round(state.preset.interval * +value.slice(1));
                     } else {
                        typer_local.interval = +value;
                     }
                     break;
                  case 'p':
                     const preset = (state.preset = speech.presets.of(value));
                     state.face = preset.faces[0];
                     typer_local.chunksize = preset.chunksize ?? 1;
                     typer_local.interval = preset.interval;
                     typer_local.threshold = preset.threshold ?? 0;
                     typer_local.sounds = preset.voices[0] ?? [];
                     text = '';
                     break;
                  case 's':
                     soundRegistry.of(value).instance(renderer);
                     break;
                  case 'v':
                     typer_local.sounds = state.preset.voices[+value] ?? [];
                     break;
               }
            }
         });

         typer_local.on('idle', () => {
            state.face?.reset();
            for (const speaker of targets!) {
               speaker.reset();
            }
            events.fire('shut-multi', index);
         });

         typer_local.on('text', content => {
            text = content;
            if (typer_local.mode === 'read' && content.length > 0) {
               if (content[content.length - 1].match(/[\.\!\?]/)) {
                  state.face?.reset();
                  for (const speaker of targets!) {
                     speaker.reset();
                  }
                  events.fire('shut-multi', index);
               } else {
                  state.face?.enable();
                  for (const speaker of targets!) {
                     speaker.enable();
                  }
                  events.fire('talk-multi', index);
               }
            }
         });

         typer_local.on('inst', instance => {
            if (battler.multitext.sounds.has(instance.daemon)) {
               instance.gain.value = 0;
            } else {
               battler.multitext.sounds.add(instance.daemon);
               renderer.post().then(() => battler.multitext.sounds.delete(instance.daemon));
            }
         });
         cutscene || index > 0 || atlas.switch('dialoguerBase');
      } else {
         fontName = () => speech.state.fontName2;
         fontSize = () => speech.state.fontSize2;
         provider = () => game.text;
         typer_current = typer;
         cutscene || atlas.switch('dialoguerBase');
      }
      const container = new CosmosObject({ position, objects: [ bubble(fontName, fontSize, provider) ] });
      renderer.attach('menu', container);
      typer_current.magic ||= battler.generic_magic;
      await typer_current.text(...lines);
      typer_current.magic = '';
      renderer.detach('menu', container);
      if (battler.multitext.active) {
         if (++battler.multitext.done === battler.multitext.targets.length) {
            battler.multitext.done = 0;
            battler.multitext.targets = [];
            battler.multitext.typers = [];
            cutscene || atlas.switch(null);
         }
      } else {
         cutscene || atlas.switch(null);
      }
   },
   /** extra monsters text */
   multitext: {
      active: false,
      done: 0,
      sounds: new Set<CosmosDaemon>(),
      targets: [] as Set<CosmosSprite>[],
      typers: [] as CosmosTyper[]
   },
   // current music
   music: null as null | CosmosInstance,
   noItemChoice: false,
   opponentHandler<A extends CosmosKeyed> ({
      bubble = [ { x: 0, y: 0 }, () => new CosmosObject() ] as CosmosProvider<
         [
            CosmosPointSimple,
            (fontName?: () => string, fontSize?: () => number, content?: () => string) => CosmosObject
         ],
         [CosmosPoint]
      >,
      defaultTalk = [] as CosmosProvider<string[] | string[][], [OutertaleTurnState<A>]>,
      defaultStatus = [] as CosmosProvider<string[] | string[][], [OutertaleTurnState<A>]>,
      vars = {} as A,
      prechoice = (state: OutertaleTurnState<A>): Promise<void> | void => {},
      prefight = (state: OutertaleTurnState<A>, power: number): Promise<void> | void => {},
      fight = ({ volatile }: OutertaleTurnState<A>, power: number) =>
         battler.attack(volatile, volatile.sparable ? { power: 0, operation: 'multiply' } : { power }),
      postfight = (state: OutertaleTurnState<A>, power: number): Promise<void> | void => {},
      fake = (state: OutertaleTurnState<A>): Promise<void> | void => {},
      preact = (state: OutertaleTurnState<A>, act: string): Promise<void> | void => {},
      act = {} as Partial<CosmosKeyed<(state: OutertaleTurnState<A>) => Promise<void> | void, string>>,
      kill = (state: OutertaleTurnState<A>): Promise<void> | void => {},
      postact = (state: OutertaleTurnState<A>, act: string): Promise<void> | void => {},
      preitem = (state: OutertaleTurnState<A>, item: string): Promise<void> | void => {},
      item = {} as Partial<CosmosKeyed<(state: OutertaleTurnState<A>) => Promise<void> | void, string>>,
      postitem = (state: OutertaleTurnState<A>, item: string): Promise<void> | void => {},
      spare = (state: OutertaleTurnState<A>): Promise<void> | void => void battler.spare(),
      flee = (state: OutertaleTurnState<A>): Promise<boolean> | boolean => {
         events.fire('escape');
         return true;
      },
      assist = (state: OutertaleTurnState<A>): Promise<void> | void => {},
      postchoice = (state: OutertaleTurnState<A>): Promise<void> | void => {},
      pretalk = (state: OutertaleTurnState<A>): Promise<void> | void => {},
      posttalk = (state: OutertaleTurnState<A>): Promise<void> | void => {},
      prestatus = (state: OutertaleTurnState<A>): Promise<void> | void => {},
      poststatus = (state: OutertaleTurnState<A>): Promise<void> | void => {}
   } = {}): OutertaleOpponent['handler'] {
      return async function handler (choice, target, volatile) {
         const opponent = volatile.opponent;
         if (volatile.vars[''] === void 0) {
            volatile.vars[''] = { reward: false, hp: volatile.hp };
            Object.assign(volatile.vars, vars);
         }
         const state: OutertaleTurnState<A> = {
            choice,
            target,
            volatile,
            opponent,
            talk: defaultTalk || [],
            status: defaultStatus || [],
            hurt: false,
            dead: false,
            pacify: false,
            vars: volatile.vars as OutertaleTurnState<A>['vars'],
            async dialogue (cutscene: boolean, ...lines: string[]) {
               await battler.monster(
                  cutscene,
                  ...CosmosUtils.provide(bubble, volatile.container.position.clone()),
                  ...lines
               );
            }
         };
         const sparing = battler.sparing(choice);
         let idler = null as Promise<void> | null;
         if (choice.type !== 'none') {
            await prechoice(state);
            switch (choice.type) {
               case 'fight':
                  await prefight(state, choice.score);
                  if (await fight(state, choice.score)) {
                     await kill(state);
                     state.dead = true;
                  } else {
                     state.hurt = true;
                  }
                  await postfight(state, choice.score);
                  break;
               case 'fake':
                  await fake(state);
                  break;
               case 'act':
                  await preact(state, choice.act);
                  await act[choice.act]?.(state);
                  await postact(state, choice.act);
                  break;
               case 'item':
                  await preitem(state, choice.item);
                  await item[choice.item]?.(state);
                  await postitem(state, choice.item);
                  break;
               case 'spare':
                  await spare(state);
                  break;
               case 'flee':
                  if (await flee(state)) {
                     return;
                  }
                  break;
               case 'assist':
                  await assist(state);
                  break;
            }
            if (state.pacify) {
               volatile.sparable = true;
            }
            await postchoice(state);
            sparing || (idler = battler.idle(volatile));
         }
         if (volatile.alive && !sparing) {
            await pretalk(state);
            const talk = CosmosUtils.provide(state.talk, state);
            if (talk.length > 0) {
               await state.dialogue(
                  false,
                  ...(typeof talk[0] === 'string' ? (talk as string[]) : selectText(talk as string[][]))
               );
            }
            await posttalk(state);
         }
         if (choice.type !== 'none') {
            await idler;
            if (volatile.alive) {
               await prestatus(state);
               const status = CosmosUtils.provide(state.status, state);
               if (status.length > 0) {
                  battler.status =
                     typeof status[0] === 'string' ? (status as string[]) : selectText(status as string[][]);
               }
               await poststatus(state);
            }
            if (state.pacify) {
               volatile.sparable = true;
            }
         }
         battler.alive.length === 0 && battler.music?.stop();
      };
   },
   opponentRegistry: new CosmosRegistry(new OutertaleOpponent()),
   // keys of active opponents
   get opponents () {
      return battler.alive.map(value => value.opponent);
   },
   // "over the battle box" display layer
   overlay: new CosmosObject(),
   pattern<A extends any> (channel: string, values: A[], r = rng.pattern.next()) {
      const patterns = (battler.patterns[channel] ??= [ {}, 0 ]);
      const filteredValues = patterns[1] < 2 ? values : values.filter(value => value !== patterns[0]);
      const id = filteredValues[Math.floor(r * filteredValues.length)];
      if (patterns[0] === id) {
         patterns[1]++;
      } else {
         patterns[0] = id;
         patterns[1] = 1;
      }
      return id as A;
   },
   patterns: {} as CosmosKeyed<[any, number]>,
   // fixes active battler button
   refocus () {
      const selection = atlas.target === 'battlerAdvanced' && atlas.navigators.of('battlerAdvanced').selection();
      for (const button of battler.buttons) {
         if (button.metadata.button === selection) {
            button.index = 1;
            battler.SOUL.position = button.position.add(8, 11);
         } else {
            button.index = 0;
         }
      }
   },
   // HP regen system
   regen: {
      time: 0,
      value: 0,
      reset () {
         battler.regen.time = 0;
         battler.regen.value = 0;
      }
   },
   reposition (sizeX = 282.5) {
      battler.box.position.x = 160;
      battler.box.position.y = 160;
      battler.box.size.x = sizeX;
      battler.box.size.y = 65;
   },
   // resets the battle box
   reset (sizeX = 282.5, flee = true) {
      battler.alpha.value = 1;
      battler.flee = flee;
      battler.assist = false;
      battler.exp = 0;
      battler.g = 0;
      battler.grid = null;
      battler.groups = [];
      battler.instafade = false;
      battler.invulnerable = 0;
      battler.multitext.active = false;
      battler.music = null;
      battler.overlay.area = null;
      battler.overlay.filters = null;
      battler.patterns = {};
      battler.volatile = [];
      for (const stat of Object.values(battler.stat)) {
         stat.modifiers = [];
      }
      battler.reposition(sizeX);
      (battler.SOUL.objects[0] as CosmosAnimation).reset();
      battler.active = true;
   },
   // re-enter main screen
   async resume (script?: (o: {}) => Promise<void | {}>) {
      if (script) {
         game.movement = true;
         const o = {};
         if ((await script(o)) === o) {
            return;
         }
         game.movement = false;
      }
      battler.SOUL.velocity.y = 0;
      atlas.switch('battlerAdvanced');
      atlas.attach(renderer, 'menu', 'battlerAdvancedText');
      for (const stat of [
         battler.stat.speed,
         battler.stat.monsteratk,
         battler.stat.monsterdef,
         battler.stat.invulnerability
      ]) {
         stat.elapse();
      }
      events.fire('resume');
      battler.SOUL.alpha.value = 1;
   },
   async sequence (count: number, generator: (promises: Promise<void>[], index: number) => Promise<void>) {
      let index = 0;
      const promises = [] as Promise<void>[];
      while (index < count) {
         await generator(promises, index++);
      }
      await Promise.all(promises);
   },
   shadow: new CosmosSprite({
      alpha: 0,
      scale: 1.5,
      anchor: 0,
      frames: [ content.ibuCyanReticle ],
      priority: 1000.1
   }),
   async shatter (group: OutertaleGroup) {
      battler.load(group);
      sounds.shatter.instance(renderer).gain.value *= 0.8;
      await renderer.pause(1000);
   },
   // simple screen
   async simple (script: () => Promise<void>) {
      battler.active || battler.reset(77.5, false);
      script();
      battler.alpha.value = 1;
      atlas.switch('battlerSimple');
      renderer.attach('menu', battler.SOUL);
      renderer.alpha.modulate(renderer, 300, 1);
      events.fire('battle');
      await events.on('exit');
      await renderer.alpha.modulate(renderer, 300, 0);
      atlas.switch(null);
      battler.SOUL.alpha.value = 0;
      await battler.cleanup();
   },
   SOUL: new CosmosHitbox({
      alpha: 0,
      metadata: {
         color: 'red' as 'red' | 'blue' | 'cyan' | 'cyangreen' | 'green' | 'purple' | 'orange' | 'yellow',
         collision: true,
         cyanLeap: false,
         cyanLeapEcho: [] as CosmosSprite[],
         cyanLeapFrom: new CosmosPoint(),
         cyanLeapTick: 0,
         cyanLeapTo: new CosmosPoint(),
         cyanShadowInner: false,
         cyanShadowTick: 0,
         cyanShadowVisible: false,
         orangeFactors: [] as number[],
         orangeTick: 0,
         orangeFilter: new AdvancedBloomFilter({ threshold: 0, bloomScale: 1, quality: 10, brightness: 1 }),
         orangeShake: true,
         orangeGraphics: new Graphics(),
         shot_tick: 0,
         shot_obj: [] as CosmosObject[],
         spriteoverride: null as CosmosAnimationResources | null,
         ticked: false,
         moved: false,
         layer: null as null | CosmosObject
      },
      anchor: 0,
      priority: 1000,
      size: 6,
      objects: [ new CosmosAnimation({ anchor: 0, scale: 0.5, resources: content.ibuSOUL }) ]
   }).on('tick', function () {
      // get SOUL sprite
      const sprite = this.objects[0] as CosmosAnimation;

      // invulnerability handling
      if (battler.invulnerable !== 0) {
         if (this.alpha.value === 0) {
            battler.invulnerable = 0;
            this.metadata.spriteoverride === null && sprite.reset();
         } else if (--battler.invulnerable === 0) {
            this.metadata.spriteoverride === null && sprite.reset();
         }
      }

      if (!battler.active || this.alpha.value === 0 || SAVE.data.n.hp <= 0 || !game.movement) {
         if (this.metadata.cyanLeap) {
            this.metadata.cyanLeap = false;
         }
         if (this.metadata.orangeFactors.length !== 0) {
            this.metadata.orangeFactors.splice(0, this.metadata.orangeFactors.length);
         }
      }

      // handle cyan SOUL shadow (outline thingy)
      if (
         game.movement &&
         this.alpha.value !== 0 &&
         (this.metadata.color === 'cyan' || this.metadata.color === 'cyangreen')
      ) {
         this.metadata.cyanShadowTick !== 9 && this.metadata.cyanShadowTick++;
         if (!this.metadata.cyanShadowVisible) {
            this.metadata.cyanShadowVisible = true;
            battler.shadow.position.set(this);
            if (this.metadata.cyanShadowInner) {
               battler.box.objects[2].attach(battler.shadow);
            } else if (battler.SOUL.metadata.layer === null) {
               renderer.attach('menu', battler.shadow);
            } else {
               battler.SOUL.metadata.layer.attach(battler.shadow);
            }
         }
         battler.shadow.scale.set(1.5 - this.metadata.cyanShadowTick / 9);
         battler.shadow.alpha.value = this.metadata.cyanShadowTick / 9;
      } else {
         this.metadata.cyanShadowTick !== 0 && this.metadata.cyanShadowTick--;
         if (this.metadata.cyanShadowTick === 0) {
            if (this.metadata.cyanShadowVisible) {
               this.metadata.cyanShadowVisible = false;
               if (this.metadata.cyanShadowInner) {
                  this.metadata.cyanShadowInner = false;
                  battler.box.objects[2].detach(battler.shadow);
               } else if (battler.SOUL.metadata.layer === null) {
                  renderer.detach('menu', battler.shadow);
               } else {
                  battler.SOUL.metadata.layer.detach(battler.shadow);
               }
            }
         } else {
            battler.shadow.scale.set(1.5 - this.metadata.cyanShadowTick / 9);
            battler.shadow.alpha.value = this.metadata.cyanShadowTick / 9;
         }
      }

      if (this.metadata.orangeTick !== 0) {
         if (this.metadata.orangeTick-- === 15) {
            this.area = renderer.area;
            this.filters = [ this.metadata.orangeFilter ];
            this.updateFilters();
            this.container.addChild(this.metadata.orangeGraphics);
            this.metadata.orangeShake && shake();
            sounds.boom_orange.instance(renderer);
            this.metadata.orangeFactors.push(60);
         }
         if (this.metadata.orangeTick === 0) {
            this.area = null;
            this.filters = null;
            this.updateFilters();
            this.container.removeChild(this.metadata.orangeGraphics);
         } else {
            this.metadata.orangeFilter.bloomScale = this.metadata.orangeTick / 15;
            this.metadata.orangeGraphics.clear();
            if (this.metadata.orangeTick > 2) {
               const t = 17 - this.metadata.orangeTick;
               const r = t * 4;
               this.metadata.orangeGraphics
                  .beginFill(0xffffff, 1 - t / 10)
                  .drawCircle(0, 0, r)
                  .endFill()
                  .beginHole()
                  .drawCircle(0, 0, r - 2)
                  .endHole();
               for (const object of renderer.calculate('menu', o => o.metadata.shootable)) {
                  const e = this.position.extentOf(object.polygon.pos);
                  if (r - e > 0) {
                     (object as CosmosHitbox<CosmosBaseEvents & { shot: [number, number] }>).fire(
                        'shot',
                        this.position.angleTo(object.polygon.pos),
                        e
                     );
                  }
               }
            }
         }
      }

      // no SOUL movement to see here
      if (!battler.active || this.alpha.value === 0) {
         sprite.offsets[0].set(0);
         return;
      }

      // or here!!!
      if (SAVE.data.n.hp <= 0) {
         return;
      }

      // set SOUL color
      if (this.metadata.spriteoverride === null) {
         switch (this.metadata.color) {
            case 'purple':
               sprite.resources === content.ibuPurpleSOUL || (sprite.resources = content.ibuPurpleSOUL);
               break;
            case 'blue':
               sprite.resources === content.ibuBlueSOUL || (sprite.resources = content.ibuBlueSOUL);
               break;
            case 'cyan':
               sprite.resources === content.ibuCyanSOUL || (sprite.resources = content.ibuCyanSOUL);
               break;
            case 'cyangreen':
               sprite.resources === content.ibuCyangreenSOUL || (sprite.resources = content.ibuCyangreenSOUL);
               break;
            case 'green':
               sprite.resources === content.ibuGreenSOUL || (sprite.resources = content.ibuGreenSOUL);
               break;
            case 'yellow':
               sprite.resources === content.ibuYellowSOUL || (sprite.resources = content.ibuYellowSOUL);
               break;
            case 'orange':
               sprite.resources === content.ibuOrangeSOUL || (sprite.resources = content.ibuOrangeSOUL);
               break;
            default:
               sprite.resources === content.ibuSOUL || (sprite.resources = content.ibuSOUL);
         }
      } else {
         sprite.resources === this.metadata.spriteoverride || (sprite.resources = this.metadata.spriteoverride);
      }

      if (!game.movement) {
         switch (atlas.target) {
            case 'battlerAdvancedAct': {
               this.position.x = 32 + atlas.navigators.of(atlas.target).position.y * 130 + 4;
               this.position.y = 139 + atlas.navigators.of(atlas.target).position.x * 16 + 4;
               break;
            }
            case 'battlerAdvancedItem': {
               this.position.x = 32 + (atlas.navigators.of(atlas.target).position.y % 2) * 130 + 4;
               this.position.y = 139 + 4;
               break;
            }
            case 'battlerAdvancedMercy': {
               if (CosmosUtils.provide(battler.target?.opponent.mercyoverride ?? null) !== null) {
                  this.position.x = 32 + atlas.navigators.of(atlas.target).position.x * 130 + 4;
                  this.position.y = 139 + atlas.navigators.of(atlas.target).position.y * 16 + 4;
                  break;
               }
            }
            case 'battlerAdvancedTarget': {
               this.position.x = 32 + atlas.navigators.of(atlas.target).position.x * 130 + 4;
               this.position.y = 139 + atlas.navigators.of(atlas.target).position.y * 16 + 4;
               break;
            }
         }
         sprite.offsets[0].set(0);
         return;
      }

      // get thing to move and its current position
      const movetarget = this.metadata.color === 'cyan' || this.metadata.color === 'cyangreen' ? battler.shadow : this;

      // minimum x and y (box edges)
      const minX =
         battler.box.position.x +
         battler.box.objects[0].position.x +
         ((this.metadata.color === 'purple' ? battler.line.width : battler.box.size.x) / -2 + 4);
      const minY = battler.box.position.y + battler.box.size.y / -2 + 4;

      // maximum x and y (box edges)
      const maxX =
         battler.box.position.x +
         battler.box.objects[0].position.x +
         ((this.metadata.color === 'purple' ? battler.line.width : battler.box.size.x) / 2 - 4);
      const maxY =
         this.metadata.color === 'blue'
            ? Math.min(
                 battler.box.position.y + battler.box.size.y / 2 - 4,
                 ...renderer.calculate('menu', p => p.metadata.platform !== void 0).map(p => p.metadata.platform)
              )
            : battler.box.position.y + battler.box.size.y / 2 - 4;

      // clamp current position to box bounds
      movetarget.position.x < minX && (movetarget.position.x = minX);
      movetarget.position.x > maxX && (movetarget.position.x = maxX);
      movetarget.position.y < minY && (movetarget.position.y = minY);
      movetarget.position.y > maxY && (movetarget.position.y = maxY);

      // movement stuff
      this.metadata.moved = false;
      if (!this.metadata.cyanLeap && this.metadata.color !== 'green') {
         // get current position
         const position = movetarget.position.value();

         // get movement speed
         const rate =
            Math.round(
               (battler.stat.speed.compute() / (keyState.special ? 2 : 1)) *
                  (this.metadata.color === 'cyan' || this.metadata.color === 'cyangreen'
                     ? 2
                     : this.metadata.color === 'orange'
                     ? 0.75 - this.metadata.orangeFactors.length * 0.05
                     : 1) *
                  1000
            ) / 1000;

         // get directional state
         movetarget.position.x += rate * (keyState.left ? -1 : keyState.right ? 1 : 0);

         // vertical input
         if (this.metadata.color === 'blue') {
            if (keyState.up) {
               movetarget.position.y === maxY && (movetarget.velocity.y = -3);
            } else {
               movetarget.velocity.y <= -0.5 && (movetarget.velocity.y = -0.5);
            }
            if (movetarget.velocity.y <= -2) {
               movetarget.velocity.y += 0.1;
            } else if (movetarget.velocity.y <= -0.5) {
               movetarget.velocity.y += 0.25;
            } else if (movetarget.velocity.y <= 0.25) {
               movetarget.velocity.y += 0.1;
            } else if (movetarget.velocity.y < 4) {
               movetarget.velocity.y += 0.3;
            }
         } else if (this.metadata.color === 'purple' && battler.line.active) {
            const invuln = battler.line.swap_invuln;
            if (invuln) {
               battler.line.swap_invuln = false;
            }
            if (battler.line.swap !== 0) {
               this.metadata.moved = true;
            }
            battler.line.pos.y += battler.line.loop + battler.line.swap * (20 / 3);
            if (battler.line.swap === 0) {
               battler.line.pos.y =
                  battler.line.offset + Math.round((battler.line.pos.y - battler.line.offset) / 20) * 20;
            }
            movetarget.position.y =
               (battler.line.box_override ?? battler.box.position.y - battler.box.size.y / 2) + battler.line.pos.y;
            if (battler.line.loop > 0 && movetarget.position.y > (battler.line.maxY ?? maxY)) {
               battler.damage(battler.line.damage + battler.bonus);
               battler.line.swap = -1;
               battler.line.swap_invuln = true;
            } else if (battler.line.loop < 0 && movetarget.position.y < (battler.line.minY ?? minY)) {
               battler.damage(battler.line.damage + battler.bonus);
               battler.line.swap = 1;
               battler.line.swap_invuln = true;
            } else if (!invuln && battler.line.swap !== 0) {
               let index = 0;
               const amount = battler.line.amount();
               while (index !== amount) {
                  if (Math.abs(battler.line.offset + index++ * 20 - battler.line.pos.y) <= 3.5) {
                     battler.line.swap = 0;
                     break;
                  }
               }
            }
         } else if (this.metadata.color !== 'cyangreen') {
            movetarget.position.y += rate * (keyState.up ? -1 : keyState.down ? 1 : 0);
         }

         // clamp actual position to box bounds
         movetarget.position.x < minX && (movetarget.position.x = minX);
         movetarget.position.x > maxX && (movetarget.position.x = maxX);
         movetarget.position.y < minY && (movetarget.position.y = minY);
         movetarget.position.y > maxY && (movetarget.position.y = maxY);

         // ensure SOUL is clamped as well
         if (movetarget !== this) {
            this.position.x < minX && (this.position.x = minX);
            this.position.x > maxX && (this.position.x = maxX);
            this.position.y < minY && (this.position.y = minY);
            this.position.y > maxY && (this.position.y = maxY);
         }

         // detect movement
         if ((keyState.left || keyState.right) && this.position.x - position.x !== 0) {
            this.metadata.moved = true;
         } else if (this.metadata.color === 'blue' && this.position.y < maxY) {
            this.metadata.moved = true;
         } else if (
            battler.SOUL.metadata.color !== 'purple' &&
            (keyState.up || keyState.down) &&
            this.position.y - position.y !== 0
         ) {
            this.metadata.moved = true;
         }
      }

      if (this.metadata.orangeFactors.length !== 0) {
         this.metadata.orangeFactors.splice(
            0,
            this.metadata.orangeFactors.length,
            ...this.metadata.orangeFactors.map(fac => fac - 1).filter(fac => fac !== 0)
         );
      }

      sprite.offsets[0].set(this.position.multiply(2).round().divide(2).subtract(this.position));
      this.metadata.ticked = true;

      if (this.metadata.cyanLeap) {
         if (this.metadata.cyanLeapTick++ === 0) {
            this.metadata.cyanLeapFrom.set(this);
            this.metadata.cyanLeapTo.set(battler.shadow);
            sounds.arrow_leap.instance(renderer);
         }
         this.position.set(
            this.metadata.cyanLeapFrom.add(
               this.metadata.cyanLeapTo.subtract(this.metadata.cyanLeapFrom).multiply(this.metadata.cyanLeapTick / 3)
            )
         );
         if (this.metadata.cyanLeapTick === 3) {
            this.metadata.cyanLeap = false;
         } else {
            const s = quickshadow(sprite, this, battler.SOUL.metadata.layer ?? 'menu', 0.4, 1 / 0.9, 0.2);
            s.tint = sprite.tint;
            this.metadata.cyanLeapEcho.push(s);
            s.metadata.e.promise.then(() => {
               const idx = this.metadata.cyanLeapEcho.indexOf(s);
               idx === -1 || this.metadata.cyanLeapEcho.splice(idx, 1);
            });
            return;
         }
      }

      if (this.metadata.shot_tick !== 0) {
         if (this.metadata.shot_tick-- === 4) {
            sounds.heartshot.instance(renderer);
            const shot = new CosmosHitbox({
               anchor: { x: 0, y: -0.75 },
               velocity: { y: -8 },
               position: battler.SOUL,
               size: { x: 2, y: 20 },
               scale: 0.5,
               priority: battler.SOUL.priority.value + 1,
               objects: [
                  new CosmosAnimation({
                     active: true,
                     anchor: { x: 0 },
                     resources: content.ibuYellowShot
                  }).on('tick', function () {
                     this.index === 5 && this.disable();
                  })
               ]
            }).on('tick', function () {
               if (this.position.y < 0) {
                  if (battler.SOUL.metadata.layer === null) {
                     renderer.detach('menu', this);
                  } else {
                     battler.SOUL.metadata.layer.detach(this);
                  }
               } else {
                  for (const object of renderer.detect(
                     this,
                     ...renderer.calculate('menu', o => o.metadata.shootable)
                  )) {
                     object.metadata.absorb && sounds.swallow.instance(renderer);
                     (object as CosmosHitbox<CosmosBaseEvents & { shot: [number, number] }>).fire('shot', 0, 0);
                     if (!object.metadata.scissors) {
                        if (battler.SOUL.metadata.layer === null) {
                           renderer.detach('menu', this);
                        } else {
                           battler.SOUL.metadata.layer.detach(this);
                        }
                        break;
                     }
                  }
               }
            });
            if (battler.SOUL.metadata.layer === null) {
               renderer.attach('menu', shot);
            } else {
               battler.SOUL.metadata.layer.attach(shot);
            }
            battler.SOUL.metadata.shot_obj.push(shot);
         }
      }

      if (!this.metadata.collision) {
         return;
      }

      // singular ID array
      for (const bullet of renderer.detect(
         this,
         ...renderer.calculate('menu', hitbox => hitbox.metadata.bullet === true)
      )) {
         // extract values
         const {
            damage = 0,
            color = 'white',
            modifier = void 0,
            hit = true,
            papyrus = false,
            passthrough = false
         } = bullet.metadata as Partial<{
            damage: number;
            color: 'white' | 'blue' | 'orange' | 'green' | 'yellow';
            modifier: number;
            hit: boolean;
            papyrus: boolean;
            passthrough: boolean;
         }>;

         // detect bullet type
         if (color === 'green' || color === 'yellow') {
            // healing
            heal(damage, color === 'green');
            battler.hpboost.magic -= damage;
            events.fire('heal', bullet, damage);
         } else if (
            (color === 'white' || this.metadata.moved === (color === 'blue')) &&
            (passthrough || battler.invulnerable === 0)
         ) {
            // detect sonic resonator
            if (
               !passthrough &&
               (SAVE.data.s.armor === 'sonic' || SAVE.data.s.armor === 'temyarmor') &&
               (sonic.random ??= rand_rad(rng.battle.value)).next() <
                  (SAVE.data.s.armor === 'temyarmor' ? 1 / 10 : 1 / 25)
            ) {
               // healing
               heal(damage + battler.bonus, true, true);
               battler.hpboost.magic -= damage + battler.bonus;
            } else {
               // do the damage
               battler.damage(damage + battler.bonus, modifier, hit, papyrus, bullet);
            }
         }
      }
   }),
   // spare enemies
   spare (
      target = -1,
      noEffects?: boolean,
      noVictory?: boolean,
      noSFX = false,
      forceBully = false,
      triple = false,
      noAlpha = false
   ) {
      if (target === -1) {
         let result = false;
         for (const index of battler.indexes) {
            if (battler.spare(index, noEffects, noVictory, result, forceBully, triple, noAlpha)) {
               result = true;
            }
         }
         return result;
      } else {
         const volatile = battler.volatile[target];
         if (volatile.sparable || battler.bullied.includes(volatile)) {
            // bully if true
            if (!volatile.sparable || forceBully) {
               events.fire('fatal', volatile);
               volatile.opponent.bully();
            }

            // de-activate opponent
            volatile.alive = false;

            // g reward
            battler.g += Math.round(
               volatile.opponent.g *
                  (triple ? 3 : volatile.sparable && !forceBully ? (volatile.hp < volatile.opponent.hp ? 0.5 : 1) : 1.5)
            );

            // spare animation
            if (!noEffects) {
               noSFX || sounds.goodbye.instance(renderer);
               const next = (volatile.opponent.goodbye || volatile.opponent.sprite)(volatile);
               volatile.container.objects[0] = next;
               if (!noAlpha) {
                  volatile.container.area = renderer.area;
                  (volatile.container.filters ??= []).push(new AlphaFilter(0.5));
               }
               const size = new CosmosPoint((next.metadata.size as CosmosPointSimple) || next.compute());
               const half = size.divide(2);
               const base = half.multiply(next.anchor.multiply(-1));
               next.attach(
                  ...CosmosUtils.populate(16, index => {
                     const angle = (index / 16) * 360;
                     const extent = size.extent;
                     return new CosmosAnimation({
                        active: true,
                        anchor: 0,
                        resources: content.ibuPoof,
                        position: base
                           .endpoint(angle, Math.max(extent / 6, 5))
                           .add(Math.random() * 20 - 10, Math.random() * 20 - 10),
                        velocity: CosmosMath.ray(angle, Math.max(extent / 20, 2.5) + Math.random()),
                        scale: (0.7 + Math.random()) / 2,
                        acceleration: 1 / 1.1
                     }).on('tick', function () {
                        this.index === 3 && next.detach(this);
                     });
                  })
               );
            }

            // end battle?
            if (battler.alive.length === 0) {
               noVictory || events.fire('victory');
            }
            return true;
         } else {
            return false;
         }
      }
   },
   // will spare
   sparing (choice: OutertaleChoice) {
      return (
         (choice.type === 'spare' &&
            battler.alive.filter(volatile => volatile.sparable).length + battler.bullied.length > 0) ||
         (choice.type === 'flee' && battler.flee)
      );
   },
   // start battle mode
   async start (group: OutertaleGroup) {
      battler.computeButtons();
      battler.active || battler.reset();
      let done = false;
      for (const [ opponent, position ] of group.opponents) {
         battler.add(opponent, position);
      }
      atlas.navigators.of('battlerAdvanced').position = { x: 0, y: 0 };
      battler.groups.push(group);
      battler.flee = group.flee;
      battler.grid = group.grid;
      battler.music = group.music?.instance(renderer) ?? null;
      battler.status = group.status;
      if (group.init()) {
         battler.alpha.value = 1;
         atlas.switch('battlerAdvanced');
         atlas.attach(renderer, 'menu', 'battlerAdvanced', 'battlerAdvancedText');
         renderer.attach('menu', battler.SOUL);
         events.fire('resume');
      } else {
         battler.buttons[0].index = 0;
         atlas.attach(renderer, 'menu', 'battlerAdvanced');
         renderer.attach('menu', battler.SOUL);
      }
      renderer.layers.base.active = false;
      renderer.layers.below.active = false;
      renderer.layers.main.active = false;
      renderer.layers.above.active = false;
      events.fire('battle');
      await Promise.race([
         events.on('exit').then(() => {
            done = true;
         }),
         events.on('escape').then(async () => {
            if (!done) {
               done = true;
               atlas.attach(renderer, 'menu', 'battlerAdvancedText');
               SAVE.data.n.exp <= 0 && battler.exp > 0 && (battler.exp = Math.max(battler.exp - SAVE.data.n.exp, 10));
               game.text =
                  battler.exp > 0 || battler.g > 0
                     ? text.battle.flee5.replace('$(x)', battler.exp.toString()).replace('$(y)', battler.g.toString())
                     : CosmosMath.weigh(
                          [
                             [ text.battle.flee1, 16 ],
                             [ text.battle.flee2, 2 ],
                             [ text.battle.flee3, 1 ],
                             [ text.battle.flee4, 1 ]
                          ],
                          rng.dialogue.next()
                       )!;
               battler.love();
               battler.SOUL.alpha.value = 0;
               const GTFO = new CosmosAnimation({
                  active: true,
                  anchor: { x: 1 },
                  scale: 0.5,
                  velocity: { x: -2.1 },
                  position: battler.SOUL.position.add(4, -4).value(),
                  resources: content.ibuRun
               });
               sounds.run.instance(renderer);
               renderer.attach('menu', GTFO);
               await CosmosUtils.chain<void, Promise<void>>(void 0, async (x, next) => {
                  await renderer.on('tick');
                  if (GTFO.position.x <= 0) {
                     renderer.detach('menu', GTFO);
                  } else {
                     await next();
                  }
               });
            }
         }),
         events.on('victory').then(async () => {
            if (!done) {
               done = true;
               atlas.switch('battlerAdvancedText');
               atlas.attach(renderer, 'menu', 'battlerAdvancedText');
               SAVE.data.n.exp <= 0 && battler.exp > 0 && (battler.exp = Math.max(battler.exp - SAVE.data.n.exp, 10));
               typer.variables.x = battler.exp.toString();
               typer.variables.y = battler.g.toString();
               if (battler.love()) {
                  await dialogue_primitive(text.battle.victory2);
               } else {
                  await dialogue_primitive(text.battle.victory1);
               }
            }
         })
      ]);
      atlas.switch(null);
      battler.SOUL.alpha.value = 0;
      (battler.SOUL.objects[0] as CosmosAnimation).resources = content.ibuSOUL;
      battler.SOUL.metadata.color = 'red';
      battler.groups.splice(battler.groups.indexOf(group), 1);
      battler.instafade || (await renderer.alpha.modulate(renderer, 300, 0));
      battler.overlay.objects.splice(0, battler.overlay.objects.length);
      atlas.detach(renderer, 'menu', 'battlerAdvanced', 'battlerAdvancedText');
      renderer.layers.base.active = true;
      renderer.layers.below.active = true;
      renderer.layers.main.active = true;
      renderer.layers.above.active = true;
      await battler.cleanup();
   },
   // battle stats
   stat: {
      // invulnerability frames duration
      invulnerability: new OutertaleStat(() => {
         let result = (mechanics.base_inv + (items.of(SAVE.data.s.armor).inv ?? 0) + (items.of(SAVE.data.s.weapon).inv ?? 0)) * (1 - (calcLVX() - 1) / 15);
         return result > 0 ? result : 1;
      }),
      // speed in pixels/frame
      speed: new OutertaleStat(() => {
         return mechanics.base_speed;
      }),
      // monster defense multiplier
      monsterdef: new OutertaleStat(0),
      // monster attack multiplier
      monsteratk: new OutertaleStat(0)
   },
   // current status text
   status: [] as string[],
   get target () {
      return battler.volatile[atlas.navigators.of('battlerAdvancedTarget').selection()] as OutertaleVolatile | void;
   },
   targetOverride: null as null | number,
   async turnTimer (time = 0) {
      time > 0 && (await renderer.pause(time));
      await Promise.all(events.fire('turn-timer'));
      battler.bullets.objects = [];
   },
   async unload (group: OutertaleGroup) {
      return Promise.all([
         inventories.battleAssets.unload(),
         group.assets?.unload(),
         ...[ ...new Set(group.opponents.map(opponent => opponent[0])) ].map(opponent => opponent.assets.unload())
      ]);
   },
   // vapor effect
   async vaporize (
      sprite: CosmosSprite,
      {
         rate = 4,
         snd = true,
         spread = 1,
         filter = (color: CosmosColor) => color[0] === 255 && color[1] === 255 && color[2] === 255,
         handler = null as ((increment: number) => void) | null,
         tint = renderer.tint ?? 0xffffff
      } = {}
   ) {
      const data = sprite.read();
      if (data && data.length > 0) {
         snd && sounds.goodbye.instance(renderer);
         let y = 0;
         const increment = rate / sprite.scale.y;
         const half = new CosmosPoint(data.length, data[0].length).divide(2);
         const origin = sprite.position.clone();
         const base = new CosmosPoint().subtract(half.add(half.multiply(sprite.anchor)));
         while (y < data[0].length) {
            let x = 0;
            while (x < data.length) {
               const xb = x;
               x += 1 / sprite.scale.x;
               const color = data[Math.floor(xb)][Math.floor(y)];
               if (color[3] > 0 && filter(color)) {
                  let size = 1;
                  while (size < spread && x < data.length) {
                     const after = data[Math.floor(x)][y];
                     if (
                        after[0] === color[0] &&
                        after[1] === color[1] &&
                        after[2] === color[2] &&
                        after[3] === color[3]
                     ) {
                        x += 1 / sprite.scale.x;
                        size++;
                     } else {
                        break;
                     }
                  }
                  let pos = new CosmosPoint(base.x + xb, base.y + y);
                  let stage = 0;
                  const graphics = new Graphics();
                  graphics.scale.set(1 / sprite.scale.x, 1 / sprite.scale.y);
                  graphics.tint = tint;
                  sprite.container.addChildAt(graphics, 0);
                  let speed = Math.random() * 3 + 0.5;
                  const direction = -90 + (Math.random() - 0.5) * 2 * 25;
                  const particle =
                     size > 1
                        ? 0
                        : CosmosMath.weigh(
                             [
                                [ 0, 8 ],
                                [ 1, 1 ],
                                [ 2, 1 ]
                             ],
                             Math.random()
                          )!;
                  const lifetime = [ 12, 15, 18 ][particle];
                  const baseline = [ 1, 0.85, 0.7 ][particle];
                  const ticker = () => {
                     if (stage++ === lifetime) {
                        renderer.off('tick', ticker);
                        sprite.container.removeChild(graphics);
                     } else {
                        pos = pos.endpoint(direction, speed);
                        const finalpos = pos.subtract(sprite.position).add(origin);
                        graphics.position.set(finalpos.x, finalpos.y);
                        const al = 1 - stage / lifetime;
                        graphics.clear().beginFill(CosmosImageUtils.color2hex(color), al * baseline);
                        if (al <= 0.6 && al > 0.3) {
                           speed /= 2;
                        }
                        switch (particle) {
                           case 0:
                              graphics.drawRect(0, 0, size, 1);
                              break;
                           case 1:
                              if (al > 0.6) {
                                 graphics.drawRect(0, 0, 1, 1);
                              } else if (al > 0.3) {
                                 graphics
                                    .drawRect(0, -1, 1, 1)
                                    .drawRect(-1, 0, 1, 1)
                                    .drawRect(1, 0, 1, 1)
                                    .drawRect(0, 1, 1, 1);
                              } else if (al > 0.15) {
                                 graphics
                                    .drawRect(0, -2, 1, 2)
                                    .drawRect(-2, 0, 2, 1)
                                    .drawRect(1, 0, 2, 1)
                                    .drawRect(0, 1, 1, 2);
                              } else {
                                 graphics
                                    .drawRect(0, -2, 1, 1)
                                    .drawRect(-2, 0, 1, 1)
                                    .drawRect(2, 0, 1, 1)
                                    .drawRect(0, 2, 1, 1);
                              }
                              break;
                           case 2:
                              if (al > 0.6) {
                                 graphics.drawRect(0, 0, 1, 1);
                              } else if (al > 0.3) {
                                 graphics
                                    .drawRect(-1, -1, 1, 1)
                                    .drawRect(1, -1, 1, 1)
                                    .drawRect(-1, 1, 1, 1)
                                    .drawRect(1, 1, 1, 1);
                              } else if (al > 0.15) {
                                 graphics
                                    .drawRect(-1, -1, 1, 1)
                                    .drawRect(1, -1, 1, 1)
                                    .drawRect(-1, 1, 1, 1)
                                    .drawRect(1, 1, 1, 1)
                                    .drawRect(-2, -2, 1, 1)
                                    .drawRect(2, -2, 1, 1)
                                    .drawRect(-2, 2, 1, 1)
                                    .drawRect(2, 2, 1, 1);
                              } else {
                                 graphics
                                    .drawRect(-2, -2, 1, 1)
                                    .drawRect(2, -2, 1, 1)
                                    .drawRect(-2, 2, 1, 1)
                                    .drawRect(2, 2, 1, 1);
                              }
                              break;
                        }
                        graphics.endFill();
                     }
                  };
                  renderer.on('tick', ticker);
               }
            }
            await renderer.on('render');
            y += increment;
            sprite.position.y += ((sprite.anchor.y - 1) / -2) * rate;
            if (sprite instanceof CosmosAnimation) {
               sprite.subcrop.top += increment;
            } else {
               sprite.crop.top += increment;
            }
            handler?.(increment);
         }
      }
   },
   // currently active opponents in the battle
   volatile: [] as OutertaleVolatile[],
   // weapon types
   weapons: new CosmosRegistry<string, OutertaleWeapon>({
      async animation () {},
      targets: 1,
      speed: 1,
      crit: 2
   })
};

export const box = {
   get x1 () {
      return battler.box.position.x - battler.box.size.x / 2;
   },
   get x2 () {
      return battler.box.position.x + battler.box.size.x / 2;
   },
   get y1 () {
      return battler.box.position.y - battler.box.size.y / 2;
   },
   get y2 () {
      return battler.box.position.y + battler.box.size.y / 2;
   },
   get x () {
      return battler.box.position.x;
   },
   get y () {
      return battler.box.position.y;
   },
   get sx () {
      return battler.box.size.x;
   },
   get sy () {
      return battler.box.size.y;
   }
};

export const buttons = [
   new CosmosSprite({
      alpha: 0.5,
      anchor: 0,
      scale: 0.5,
      metadata: {
         target: 'menuKey' as 'menuKey',
         sides: [
            { x: 292.5, y: 161.5 },
            { x: 107.5, y: 198.5 }
         ],
         size: 36,
         touches: [] as number[]
      },
      frames: [ content.ieButtonC ]
   }),
   new CosmosSprite({
      alpha: 0.5,
      anchor: 0,
      scale: 0.5,
      metadata: {
         target: 'specialKey' as 'specialKey',
         sides: [
            { x: 252.5, y: 180 },
            { x: 67.5, y: 180 }
         ],
         size: 36,
         touches: [] as number[]
      },
      frames: [ content.ieButtonX ]
   }),
   new CosmosSprite({
      alpha: 0.5,
      anchor: 0,
      scale: 0.5,
      metadata: {
         target: 'interactKey' as 'interactKey',
         sides: [
            { x: 212.5, y: 198.5 },
            { x: 27.5, y: 161.5 }
         ],
         size: 36,
         touches: [] as number[]
      },
      frames: [ content.ieButtonZ ]
   }),
   new CosmosSprite({
      alpha: 0.5,
      anchor: 0,
      scale: 0.5,
      metadata: {
         target: null,
         sides: [
            { x: 45, y: 180 },
            { x: 275, y: 180 }
         ],
         size: 72,
         touches: [] as number[],
         joystick: [
            [ 0, 'rightKey', { active: false } ],
            [ 90, 'downKey', { active: false } ],
            [ 180, 'leftKey', { active: false } ],
            [ 270, 'upKey', { active: false } ]
         ] as [number, keyof typeof keys, { active: boolean }][]
      },
      frames: [ content.ieButtonM ],
      objects: [
         new CosmosRectangle({
            alpha: 0.5,
            anchor: 0,
            size: { x: 47, y: 47 },
            stroke: '#000',
            border: 1.5
         }),
         new CosmosRectangle({
            anchor: 0,
            size: { x: 47, y: 47 },
            stroke: '#fff',
            border: 0.5
         })
      ]
   }).on('tick', function () {
      const position = (
         this.metadata.touches.length > 0 ? mobile.state.touches[this.metadata.touches[0]]![1] : this.position
      )
         .subtract(this.position)
         .clamp(-22, 22);
      const distance = position.extent;
      const direction = distance > mobile.deadzone ? (position.angle + 360) % 360 : 0;
      for (const [ angle, key, state ] of this.metadata.joystick) {
         const active =
            distance > mobile.deadzone &&
            (key === 'rightKey'
               ? direction > 360 - mobile.arc || direction < angle + mobile.arc
               : direction > angle - mobile.arc && direction < angle + mobile.arc);
         if (active !== state.active) {
            state.active = active;
            keys[key].force1 = active;
         }
      }
      this.objects[0].position.set(position.multiply(2));
      this.objects[1].position.set(position.multiply(2));
   }),
   new CosmosSprite({
      alpha: 0.5,
      anchor: 0,
      scale: 0.5,
      metadata: {
         target: null,
         sides: [
            { x: 20, y: 20 },
            { x: 20, y: 20 }
         ],
         size: 36,
         touches: [] as number[],
         pressed: false
      },
      frames: [ content.ieButtonF ]
   }).on('tick', function () {
      if (this.metadata.touches.length !== 0) {
         this.metadata.pressed = true;
      } else if (this.metadata.pressed) {
         this.metadata.pressed = false;
         backend?.exec('f4') ?? fullscreen();
      }
   })
];

/** choicer (seperate from battle choice system) */
export const choicer = {
   /** rows available in choicer */
   type: 0,
   /** spacing from the left edge to the left choicer options */
   marginA: 0,
   /** spacing from the center to the right choicer options */
   marginB: 0,
   /** position (row of text where the choicer appears) */
   navigator: null as string | null,
   /** result (what the player selects) */
   result: 0,
   /** create choicer */
   create (
      header: string,
      ...options: [string, string] | [string, string, string, string] | [string, string, string, string, string, string]
   ) {
      let total = 0;
      for (const option of options) {
         total += CosmosTextUtils.cjk_length(CosmosTextUtils.raw(option));
      }
      const margin = Math.round((16 - total / options.length) / 2);
      const segments = [] as string[];
      for (const option of options) {
         segments.push(
            `${CosmosUtils.populate(margin, () => 'µ').join('')}${option}${CosmosUtils.populate(
               16 - margin - CosmosTextUtils.cjk_length(CosmosTextUtils.raw(option)),
               () => 'µ'
            ).join('')}`
         );
      }
      if (options.length === 2) {
         return `<99>{#p/human}${header}{!}\n${header.includes('\n') ? '' : '\n'}${segments[0]}${
            segments[1]
         }{#c/0/${margin}/${margin}}`;
      } else if (options.length === 4) {
         return `<99>{#p/human}${header}{!}\n${segments[0]}${segments[1]}\n${segments[2]}${segments[3]}{#c/1/${margin}/${margin}}`;
      } else {
         return `<99>{#p/human}{!}${segments[0]}${segments[1]}\n${segments[2]}${segments[3]}\n${segments[4]}${segments[5]}{#c/2/${margin}/${margin}}`;
      }
   }
};

export function dialogueObjects () {
   return [
      new CosmosObject({ position: { x: 34, y: 35 } }),
      menuText(0, 0, () => game.text).on('tick', function () {
         this.position.x = speech.state.face ? 69 : 11;
         switch (speech.state.fontName1) {
            case 'Papyrus':
               this.spacing.x = -0.375;
               this.spacing.y = 2;
               this.position.y = 6;
               break;
            default:
               this.spacing.x = 0;
               this.spacing.y = 5;
               this.position.y = 9;
               break;
         }
      })
   ];
}

export const dialogueSession = { active: false, movement: false };

export async function directionalInput () {
   while (true) {
      await Promise.race([
         keys.upKey.on('down'),
         keys.leftKey.on('down'),
         keys.rightKey.on('down'),
         keys.downKey.on('down')
      ]);
      if (keys.altKey.active()) {
         continue;
      }
      break;
   }
}

// front end state
export const frontEnder = {
   // sfx test function (settings menu)
   testMusic () {
      frontEnder.updateMusic();
      sounds.menuMusic.instance(renderer);
   },
   testSFX () {
      frontEnder.updateSFX();
      sounds.menu.instance(renderer);
   },
   // will do true reset
   trueReset: false,
   // current story panel index
   index: 0,
   // story panel music
   introMusic: null as CosmosInstance | null,
   // impact noise
   impactNoise: null as null | CosmosInstance,
   // language
   language: '',
   // menu music
   menuMusic: null as null | CosmosInstance,
   /** skip story panels */
   nostory: false,
   // PAN PANEL UPWARDS
   scroll: new CosmosValue(1),
   /** correct menu music to play */
   get menuMusicResource () {
      if (SAVE.flag.b.true_reset || SAVE.data.n.exp > 0 || SAVE.data.n.plot < 14) {
         return { asset: content.amMenu0, daemon: music.menu0 };
      } else if (SAVE.data.n.plot < 31) {
         return { asset: content.amMenu1, daemon: music.menu1 };
      } else if (SAVE.data.n.plot < 48) {
         return { asset: content.amMenu2, daemon: music.menu2 };
      } else if (SAVE.data.n.plot < 68) {
         return { asset: content.amMenu3, daemon: music.menu3 };
      } else {
         return { asset: content.amMenu4, daemon: music.menu4 };
      }
   },
   name: {
      // blacklisted names
      blacklist: text.menu.confirm5,
      // amount of shake to display on name
      shake: new CosmosValue(),
      // currently entered name
      value: '',
      // get name for multimode menus
      get value_true () {
         return SAVE.data.s.name && !frontEnder.trueReset ? SAVE.data.s.name : frontEnder.name.value;
      }
   },
   createBackground (priority = 0) {
      return new CosmosSprite({ alpha: 0.25, frames: [ content.ieSplashBackground ], scale: 0.5, priority });
   },
   updateRight () {
      const right = SAVE.flag.b.$option_right;
      for (const button of buttons) {
         button.position.set(button.metadata.sides[right ? 1 : 0]);
      }
   },
   updateMusic () {
      musicMixer.value = ((1 - SAVE.flag.n.$option_music) * (SAVE.flag.b.$option_music ? 0 : 1)) ** 1.5;
   },
   updateSFX () {
      soundMixer.value = ((1 - SAVE.flag.n.$option_sfx) * (SAVE.flag.b.$option_sfx ? 0 : 1)) ** 1.5;
   },
   updateEpilepsy () {
      renderer.shake_limit = SAVE.flag.b.$option_epilepsy ? 1 : Infinity;
   },
   updateFancy () {
      CosmosRenderer.fancy = SAVE.flag.b.$option_fancy;
   },
   updateDeadzone () {
      gamepadder.deadzone = SAVE.flag.n.$option_deadzone;
   },
   closeSettings () {
      const target = battler.active
         ? 'battlerAdvanced'
         : game.active
         ? null
         : SAVE.data.s.name
         ? 'frontEndLoad'
         : 'frontEndStart';
      if (frontEnder.language === SAVE.flag.s.$option_language) {
         return target;
      } else {
         frontEnder.refresh().then(() => {
            atlas.switch(target);
         });
      }
   },
   async refresh () {
      game.input = false;
      document.querySelector('#splash')?.setAttribute('visible', '');
      const focus = game.focus;
      game.focus = true;
      context.suspend();
      CosmosRenderer.suspend = true;
      await CosmosAsset.reload();
      context.resume();
      CosmosRenderer.suspend = false;
      game.focus = focus;
      document.querySelector('#splash')?.removeAttribute('visible');
      game.input = true;
   }
};

export const gamepadder = {
   deadzone: 0.5,
   get gamepad () {
      return gamepadder.index === null ? null : navigator.getGamepads()[gamepadder.index];
   },
   index: null as number | null,
   mappings: null as { button: { pressed: boolean }[]; input: CosmosKeyboardInput | 'f'; active: boolean }[] | null,
   renderer: null as CosmosRenderer | null,
   async connect (gamepad: Gamepad) {
      gamepadder.disconnect();
      gamepadder.index = gamepad.index;
      const ggRenderer = (gamepadder.renderer = new CosmosRenderer({
         auto: true,
         wrapper: '#wrapper',
         layers: { main: [] },
         width: 640,
         height: 480,
         scale: 2,
         position: { x: 160, y: 120 }
      }));
      ggRenderer.canvas.style.zIndex = '99';
      const bg = new CosmosRectangle({
         fill: '#000000cf',
         size: { x: 320, y: 240 },
         fontName: 'DeterminationSans',
         objects: [
            new CosmosText({
               anchor: 0,
               fontSize: 24,
               fill: '#fff',
               position: { x: 160, y: 30 },
               content: text.gamepad.prompt
            })
         ]
      });
      ggRenderer.attach('main', bg);
      const display1 = new CosmosText({
         anchor: 0,
         fontSize: 16,
         fill: '#fff',
         position: { x: 160, y: 90 }
      });
      const display2 = new CosmosText({
         anchor: 0,
         fontSize: 24,
         fill: '#fff',
         position: { x: 160, y: 180 }
      });
      const display3 = new CosmosText({
         anchor: 0,
         fontSize: 16,
         fill: '#fff',
         position: { x: 160, y: 220 }
      });
      bg.attach(display1, display2, display3);
      let q = false;
      const qk = keys.quitKey.on('down').then(() => (q = true));
      const controls = gamepadder.controls(gamepad);
      let load = SAVE.flag.s.$gamepad_input_f !== '';
      if (load) {
         display1.content = text.gamepad.prompt_load;
         await Promise.race([ qk, gamepadder.down(ggRenderer, controls) ]);
         if (q) {
            gamepadder.disconnect(gamepad);
            return;
         }
         let done = false;
         await Promise.race([
            qk,
            gamepadder.down(ggRenderer, controls),
            ggRenderer.pause(500).then(() => {
               done = true;
            })
         ]);
         if (q) {
            gamepadder.disconnect(gamepad);
            return;
         }
         if (!done) {
            await Promise.race([
               qk,
               gamepadder.down(ggRenderer, controls),
               ggRenderer.pause(500).then(() => {
                  done = true;
               })
            ]);
            if (q) {
               gamepadder.disconnect(gamepad);
               return;
            }
            if (!done) {
               load = false;
               display1.content = '';
               await renderer.pause(500);
            }
         }
      }
      if (!load) {
         display1.content = text.gamepad.prompt_desc;
         const assign = async (line: string) => {
            if (q) {
               return [];
            }
            display2.content = line;
            display3.content = text.gamepad.prompt_counter.replace('$(x)', '0');
            const list = [] as number[];
            while (true) {
               const value = await Promise.race([ qk, gamepadder.down(ggRenderer, controls) ]);
               if (q) {
                  return [];
               }
               if (list.includes(value as number)) {
                  display2.fill = '#0f0';
                  await Promise.race([ qk, renderer.pause(500) ]);
                  if (q) {
                     return [];
                  }
                  display2.fill = '#fff';
                  display3.fill = '#fff';
                  break;
               } else {
                  list.push(value as number);
                  display3.fill = '#0f0';
                  display3.content = text.gamepad.prompt_counter.replace('$(x)', list.length.toString());
               }
            }
            return list;
         };
         const z = await assign(text.gamepad.z);
         const x = await assign(text.gamepad.x);
         const c = await assign(text.gamepad.c);
         const u = await assign(text.gamepad.u);
         const l = await assign(text.gamepad.l);
         const d = await assign(text.gamepad.d);
         const r = await assign(text.gamepad.r);
         const f = await assign(text.gamepad.f);
         if (q) {
            gamepadder.disconnect(gamepad);
            return;
         }
         SAVE.flag.s.$gamepad_input_z = z.join(',');
         SAVE.flag.s.$gamepad_input_x = x.join(',');
         SAVE.flag.s.$gamepad_input_c = c.join(',');
         SAVE.flag.s.$gamepad_input_u = u.join(',');
         SAVE.flag.s.$gamepad_input_l = l.join(',');
         SAVE.flag.s.$gamepad_input_d = d.join(',');
         SAVE.flag.s.$gamepad_input_r = r.join(',');
         SAVE.flag.s.$gamepad_input_f = f.join(',');
         display1.content = text.gamepad.prompt_done + (backend ? '' : text.gamepad.prompt_done_browser);
         display2.content = '';
         display3.content = '';
         await gamepadder.down(ggRenderer, controls);
      }
      gamepadder.stop();
      const buttonZ = SAVE.flag.s.$gamepad_input_z.split(',').map(value => controls[+value]);
      const buttonX = SAVE.flag.s.$gamepad_input_x.split(',').map(value => controls[+value]);
      const buttonC = SAVE.flag.s.$gamepad_input_c.split(',').map(value => controls[+value]);
      const buttonU = SAVE.flag.s.$gamepad_input_u.split(',').map(value => controls[+value]);
      const buttonL = SAVE.flag.s.$gamepad_input_l.split(',').map(value => controls[+value]);
      const buttonD = SAVE.flag.s.$gamepad_input_d.split(',').map(value => controls[+value]);
      const buttonR = SAVE.flag.s.$gamepad_input_r.split(',').map(value => controls[+value]);
      const buttonF = SAVE.flag.s.$gamepad_input_f.split(',').map(value => controls[+value]);
      gamepadder.mappings = [
         { active: buttonZ.find(button => button.pressed) !== void 0, button: buttonZ, input: keys.interactKey },
         { active: buttonX.find(button => button.pressed) !== void 0, button: buttonX, input: keys.specialKey },
         { active: buttonC.find(button => button.pressed) !== void 0, button: buttonC, input: keys.menuKey },
         { active: buttonU.find(button => button.pressed) !== void 0, button: buttonU, input: keys.upKey },
         { active: buttonL.find(button => button.pressed) !== void 0, button: buttonL, input: keys.leftKey },
         { active: buttonD.find(button => button.pressed) !== void 0, button: buttonD, input: keys.downKey },
         { active: buttonR.find(button => button.pressed) !== void 0, button: buttonR, input: keys.rightKey },
         { active: buttonF.find(button => button.pressed) !== void 0, button: buttonF, input: 'f' }
      ];
   },
   controls (gamepad: Gamepad) {
      return [
         ...CosmosUtils.populate(gamepad.buttons.length, i => ({
            get pressed () {
               return gamepadder.gamepad?.buttons[i].pressed ?? false;
            }
         })),
         ...CosmosUtils.populate(gamepad.axes.length, i => ({
            get pressed () {
               return (gamepadder.gamepad?.axes[i] ?? 0) <= -gamepadder.deadzone;
            }
         })),
         ...CosmosUtils.populate(gamepad.axes.length, i => ({
            get pressed () {
               return gamepadder.deadzone <= (gamepadder.gamepad?.axes[i] ?? 0);
            }
         }))
      ];
   },
   down (gr: CosmosRenderer, gc: { pressed: boolean }[]) {
      const state = gc.map(control => control.pressed);
      return new Promise<number>(resolve => {
         const ticker = () => {
            for (const [ index, control ] of gc.entries()) {
               if (control.pressed) {
                  if (!state[index]) {
                     gr.off('tick', ticker);
                     resolve(index);
                     return;
                  }
               } else {
                  state[index] = false;
               }
            }
         };
         gr.on('tick', ticker);
      });
   },
   disconnect (gamepad: Gamepad | null = null) {
      if (gamepad === null || gamepad.index === gamepadder.index) {
         gamepadder.index = null;
         gamepadder.mappings = null;
         gamepadder.stop();
      }
   },
   reset () {
      if (gamepadder.mappings !== null) {
         for (const mapping of gamepadder.mappings) {
            mapping.active = false;
            typeof mapping.input !== 'string' && (mapping.input.force2 = false);
         }
      }
   },
   stop () {
      if (gamepadder.renderer) {
         gamepadder.renderer.stop();
         gamepadder.renderer.canvas.remove();
         gamepadder.renderer = null;
      }
   },
   update () {
      if (gamepadder.mappings !== null) {
         for (const mapping of gamepadder.mappings) {
            if (mapping.button.find(button => button.pressed) !== void 0) {
               mapping.active = true;
            } else if (mapping.active) {
               mapping.active = false;
               typeof mapping.input !== 'string' && (mapping.input.force2 = false);
               switch (mapping.input) {
                  case 'f':
                     backend?.exec('f4') ?? fullscreen();
                     break;
                  default:
                     mapping.input.force2 = true;
               }
            }
         }
      }
   }
};

export const hashes = new CosmosCache((name: string) => {
   let pos = 0;
   let hash1 = 0xdeadbeef ^ 432;
   let hash2 = 0x41c6ce57 ^ 432;
   while (pos !== name.length) {
      const code = name.charCodeAt(pos++);
      hash1 = Math.imul(hash1 ^ code, 2654435761);
      hash2 = Math.imul(hash2 ^ code, 1597334677);
   }
   hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
   hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
   return 4294967296 * (2097151 & hash2) + (hash1 >>> 0);
});

export const keyring = new CosmosRegistry<
   string,
   {
      description: CosmosProvider<string>;
      display: () => boolean;
      name: CosmosProvider<string>;
      priority?: CosmosProvider<number>;
   }
>({ display: () => false, name: '', description: '' });

export const keyState = {
   down: false,
   interact: false,
   left: false,
   menu: false,
   right: false,
   special: false,
   up: false
};

export const mobile = {
   /** joystick directional input angle range */
   arc: 57.5,
   bounds: { x: 0, y: 0 },
   clear (identifier: number) {
      for (const button of mobile.state.buttons) {
         if (button.touches.includes(identifier)) {
            button.touches.splice(button.touches.indexOf(identifier), 1);
            if (button.touches.length === 0) {
               button.active = false;
               button.object.alpha.value = 0.5;
               button.target && (keys[button.target].force1 = false);
            }
            break;
         }
      }
      delete mobile.state.touches[identifier];
   },
   /** joystick deadzone size */
   deadzone: 8,
   gamepad () {
      mobile.reset();
      return new CosmosObject({
         priority: Number.MAX_VALUE,
         objects: buttons,
         metadata: { mobile_gamepad: true }
      }).on('tick', function () {
         this.alpha.value = gamepadder.mappings === null ? 1 : 0;
      });
   },
   reset () {
      for (const button of mobile.state.buttons) {
         button.touches.splice(0, button.touches.length);
         button.active = false;
         button.object.alpha.value = 0.5;
         button.target && (keys[button.target].force1 = false);
      }
      for (const identifier in mobile.state.touches) {
         delete mobile.state.touches[identifier];
      }
   },
   state: {
      buttons: buttons.map(object => {
         const size = new CosmosPoint(object.metadata.size);
         const half = size.divide(2);
         const diff = half.add(half.multiply(object.anchor));
         return {
            active: false,
            get base () {
               return object.position.subtract(diff);
            },
            object,
            size,
            target: object.metadata.target,
            touches: object.metadata.touches
         };
      }),
      taps: 0,
      touches: {} as Partial<CosmosKeyed<[number, CosmosPoint]>>
   },
   target: null as HTMLCanvasElement | null,
   touch (identifier: number, position: CosmosPoint) {
      const touch = mobile.state.touches[identifier];
      if (touch) {
         touch[1].set(position);
      } else {
         for (const [ index, button ] of mobile.state.buttons.entries()) {
            if (
               position.x > button.base.x &&
               position.x < button.base.x + button.size.x &&
               position.y > button.base.y &&
               position.y < button.base.y + button.size.y
            ) {
               button.touches.unshift(identifier);
               mobile.state.touches[identifier] = [ index, position ];
               if (!button.active) {
                  button.active = true;
                  button.object.alpha.value = 1;
                  button.target && (keys[button.target].force1 = true);
               }
               break;
            }
         }
      }
   },
   touches (event: TouchEvent) {
      return CosmosUtils.populate(event.changedTouches.length, index => event.changedTouches.item(index)!);
   }
};

export const mobileLoader = isMobile.any && inventories.mobileAssets.load();

export const pager = {
   /** pager storage */
   storage: [] as { active: boolean; page: number; pages: CosmosProvider<string[]>[] }[],
   /** create pager */
   create<A extends any[]> (type: 0 | 1 | 2, ...pages: CosmosProvider<string[], A>[]): (...args: A) => string[] {
      switch (type) {
         case 0:
            return pager.providerLimit.bind({ active: false, page: 0, pages });
         case 1:
            return pager.providerSequence.bind({ active: false, page: pages.length, pages });
         case 2:
            return pager.providerRandom.bind({ pages: pages as CosmosProvider<string[], any[]>[] });
      }
   },
   providerLimit (this: { active: boolean; page: number; pages: CosmosProvider<string[]>[] }, ...args: any[]) {
      if (!this.active) {
         this.active = true;
         pager.storage.push(this);
      }
      return CosmosUtils.provide(this.pages[this.page === this.pages.length - 1 ? this.page : this.page++], ...args);
   },
   providerSequence (this: { active: boolean; page: number; pages: CosmosProvider<string[]>[] }, ...args: any[]) {
      if (!this.active) {
         this.active = true;
         pager.storage.push(this);
      }
      this.page === this.pages.length && (this.page = 0);
      return CosmosUtils.provide(this.pages[this.page++], ...args);
   },
   providerRandom<A extends any[]> (this: { pages: CosmosProvider<string[]>[] }, ...args: A) {
      return CosmosUtils.provide(this.pages[rng.dialogue.int(this.pages.length)], ...args);
   }
};

export const phone = new CosmosRegistry<
   string,
   {
      display: () => boolean;
      trigger: () => Promise<void> | void;
      priority?: CosmosProvider<number>;
      name: CosmosProvider<string>;
   }
>({ display: () => false, trigger: () => {}, name: '' });

export const tracker = {
   history: CosmosUtils.populate(60, () => [ 'down', { x: 0, y: 0 } ] as [CosmosDirection, CosmosPointSimple]),
   interpolate (distance: number) {
      const floor = Math.floor(distance);
      const floorPos = tracker.retrieve(floor);
      const ceilPos = tracker.retrieve(Math.ceil(distance));
      return [
         tracker.retrieve(Math.round(distance))[0],
         {
            x: CosmosMath.linear(distance - floor, floorPos[1].x, ceilPos[1].x),
            y: CosmosMath.linear(distance - floor, floorPos[1].y, ceilPos[1].y)
         }
      ] as [CosmosDirection, CosmosPointSimple];
   },
   supplant (face = player.face, origin: CosmosPointSimple = player) {
      const vec = { down: { x: 0, y: -3 }, left: { x: 3, y: 0 }, right: { x: -3, y: 0 }, up: { x: 0, y: 3 } }[face];
      for (const [ index, entry ] of tracker.history.entries()) {
         entry[0] = face;
         entry[1].x = origin.x + vec.x * index;
         entry[1].y = origin.y + vec.y * index;
      }
   },
   retrieve (index: number) {
      return tracker.history[Math.min(index, tracker.history.length - 1)] ?? [ player.face, player.position.value() ];
   }
};

export const player = new CosmosPlayer({
   anchor: { x: 0, y: 1 },
   extent: { x: 5, y: 20 },
   size: { x: 20, y: 3 },
   metadata: {
      x: NaN,
      y: NaN,
      face: '',
      archive: false,
      leap: false,
      reverse: false,
      speed: 1,
      moved: false,
      notracker: false,
      trackerbooster: 0,
      voidkey: null as { room: string; face: CosmosDirection; position: CosmosPointSimple } | null,
      cache: { room: '', water: false, archive: false, init: false, home: false }
   }
}).on('tick', function () {
   if (this.metadata.notracker) {
      return;
   }
   if (
      this.position.x !== this.metadata.x ||
      this.position.y !== this.metadata.y ||
      this.face !== this.metadata.face ||
      this.metadata.trackerbooster > 0
   ) {
      this.metadata.x = this.position.x;
      this.metadata.y = this.position.y;
      this.metadata.face = this.face;
      this.metadata.trackerbooster > 0 && this.metadata.trackerbooster--;
      tracker.history.unshift(tracker.history.pop()!);
      const node = tracker.history[0];
      node[0] = this.face;
      node[1].x = this.position.x;
      node[1].y = this.position.y;
      this.metadata.moved = true;
   } else {
      this.metadata.moved = false;
   }
});

export const portraits = new CosmosRegistry<string, CosmosSprite>(new CosmosSprite());

export const escText = new CosmosText({
   alpha: 0,
   position: { x: 5, y: 5 },
   fill: '#fff',
   fontName: 'DiaryOfAn8BitMage',
   fontSize: 10,
   metadata: { state: 0, renderer: renderer as CosmosRenderer },
   priority: Infinity,
   stroke: ''
}).on('tick', function () {
   this.content =
      backend === null || SAVE.ready
         ? [ text.extra.restartText1, text.extra.restartText2, text.extra.restartText3 ][
              Math.min(escText.metadata.state, 2)
           ]
         : [ text.extra.quitText1, text.extra.quitText2, text.extra.quitText3 ][Math.min(escText.metadata.state, 2)];
});

// save menu state
export const saver = {
   locations: new CosmosRegistry<string, { name: CosmosProvider<string>; text: CosmosProvider<string[]> }>({
      name: '',
      text: []
   }),
   save (room = game.room) {
      saver.time = SAVE.data.n.time;
      SAVE.data.n.base_attack = rng.attack.value;
      SAVE.data.n.base_battle = rng.battle.value;
      SAVE.data.n.base_dialogue = rng.dialogue.value;
      SAVE.data.n.base_overworld = rng.overworld.value;
      SAVE.data.n.base_pattern = rng.pattern.value;
      SAVE.data.s.room = room;
      events.fire('save');
      SAVE.save();
   },
   time: -Infinity,
   yellow: false
};

// shop state
export const shopper = {
   get index () {
      return atlas.navigators.of('shop').position.y;
   },
   get listIndex () {
      return atlas.navigators.of('shopList').position.y;
   },
   async open (shop: OutertaleShop, face: CosmosDirection, x: number, y: number, keeper = world.population > 0) {
      const movementValue = game.movement;
      game.movement = false;
      shopper.value = shop;
      await Promise.all([ game.music?.gain.modulate(renderer, 300, 0), renderer.alpha.modulate(renderer, 300, 0) ]);
      renderer.layers.base.active = false;
      renderer.layers.below.active = false;
      renderer.layers.main.active = false;
      renderer.layers.above.active = false;
      const display = new CosmosObject({ priority: -1000, objects: [ shopper.value.background ] });
      const persist = shopper.value.persist();
      (keeper || persist) && display.attach(shopper.value.keeper);
      renderer.attach('menu', display);
      atlas.switch('shop');
      const mus = SAVE.data.n.plot === 72 ? void 0 : shopper.value.music?.instance(renderer);
      if (mus) {
         mus.rate.value *= persist ? 1 : world.rate(mus.daemon);
         mus.gain.value /= 4;
         mus.gain.modulate(renderer, 300, mus.gain.value * 4);
      }
      renderer.alpha.modulate(renderer, 300, 1);
      await renderer.when(() => !atlas.target);
      player.face = face;
      player.position.set(x, y);
      renderer.detach('menu', display);
      shopper.value = null;
      game.movement = movementValue;
      game.music?.gain.modulate(renderer, 300, world.level);
      renderer.layers.base.active = true;
      renderer.layers.below.active = true;
      renderer.layers.main.active = true;
      renderer.layers.above.active = true;
   },
   async text (...lines: string[]) {
      const prev = atlas.target;
      atlas.switch('shopText');
      await dialogue_primitive(...lines);
      atlas.switch(prev);
   },
   value: null as OutertaleShop | null
};

export const sidebarrer = {
   // current dim box
   dimbox: 'dimboxA' as 'dimboxA' | 'dimboxB',
   // can move after using item
   use_movement: true,
   get item () {
      return SAVE.storage.inventory.of(atlas.navigators.of('sidebarItem').position.y)!;
   },
   get use () {
      return [ 'consumable', 'special' ].includes(items.of(sidebarrer.item).type);
   },
   async openSettings () {
      battler.active ? (battler.SOUL.alpha.value = 0) : (game.movement = false);
      const background = new CosmosRectangle({ fill: '#000', size: { x: 320, y: 240 } });
      renderer.attach('menu', background);
      atlas.switch('frontEndSettings');
      await atlas.navigators.of('frontEndSettings').on('to');
      renderer.detach('menu', background);
      battler.active ? (battler.SOUL.alpha.value = 1) : (game.movement = true);
   }
};

export const teleporter = {
   attach: true,
   hot: false,
   forcemove: false,
   movement: false,
   timer: false,
   menu: false,
   nomusic: false,
   region: null as CosmosRegion | null
};

export const world = {
   /** kill value percieved by alphys (outlands kills count as 1/8th value) */
   get alphys_percieved_kills () {
      return world.trueKills - SAVE.data.n.kills_wastelands * (7 / 8);
   },
   /** ambient pitch level for game music */
   get ambiance () {
      return world.rate(game.room);
   },
   /** archive mode */
   archive: false,
   get bad_lizard () {
      return SAVE.data.b.bad_lizard ? 1 : SAVE.data.n.bad_lizard;
   },
   get badder_lizard () {
      return SAVE.data.n.bad_lizard + (SAVE.data.b.bad_lizard ? 1 : 0) > 1;
   },
   get bad_robot () {
      return world.bad_lizard === 2 && SAVE.data.n.state_aerialis_basekill + 3 <= world.falseKills;
   },
   bully () {
      SAVE.data.n.bully++;
      if (world.population > 0) {
         switch (game.room[0]) {
            case 'w':
               SAVE.data.n.bully_wastelands++;
               break;
            case 's':
               SAVE.data.n.bully_starton++;
               break;
            case 'f':
               SAVE.data.n.bully_foundry++;
               break;
            case 'a':
               SAVE.data.n.bully_aerialis++;
               break;
         }
         if (antiAteThreshold()) {
            game.music && (game.music.rate.value = rooms.of(game.room).score.rate * world.ambiance);
         }
      }
   },
   bullied_area (area = game.room[0] || SAVE.data.s.room[0]) {
      switch (area) {
         case 'w':
            return SAVE.data.n.bully_wastelands - SAVE.data.n.evac_wastelands > 16 * (2 / 3);
         case 's':
            return SAVE.data.n.bully_starton - SAVE.data.n.evac_starton > world.popmax(0) * (2 / 3);
         case 'f':
            return SAVE.data.n.bully_foundry - SAVE.data.n.evac_foundry > world.popmax(1) * (2 / 3);
         case 'a':
            return SAVE.data.n.bully_aerialis - SAVE.data.n.evac_aerialis > world.popmax(2) * (2 / 3);
         default:
            return false;
      }
   },
   get bullied () {
      return world.bullied_area();
   },
   /** any active cutscene spanning multiple rooms */
   cutscene () {
      return (
         world.cutscene_override ||
         [
            2.71,
            ...(game.room === 'w_exit' || game.room[0] === 's' ? [ 16 ] : []),
            16.1,
            38,
            47.2,
            ...(!world.badder_lizard ? [ 64 ] : [ 64.1 ]),
            ...(SAVE.data.b.freedom ? [] : [ 72 ])
         ].includes(SAVE.data.n.plot)
      );
   },
   /** force cutscene mode */
   cutscene_override: false,
   get darker () {
      if (
         world.trueKills > 9 ||
         SAVE.data.n.state_wastelands_toriel === 2 ||
         SAVE.data.n.state_starton_papyrus === 1 ||
         SAVE.flag.n.pacifist_marker_bully > 3
      ) {
         return true;
      }
      let score = world.trueKills;
      if (SAVE.data.n.state_starton_doggo === 2) {
         score += 2;
      }
      if (SAVE.data.n.state_starton_lesserdog === 2) {
         score += 2;
      }
      if (SAVE.data.n.state_starton_dogs === 2) {
         score += 2;
      }
      if (SAVE.data.n.state_starton_greatdog === 2) {
         score += 2;
      }
      if (SAVE.data.n.state_foundry_undyne === 1) {
         score += 7;
      }
      if (SAVE.data.b.f_state_kidd_betray) {
         score += 5;
      }
      if (SAVE.data.b.a_state_napstadecline) {
         score += 3;
      }
      if (SAVE.data.b.f_state_blookbetray) {
         score += 1;
      }
      return 10 <= score;
   },
   /** true if all dogs except lesser dog is dead */
   get dead_dog () {
      return (
         SAVE.data.n.state_starton_doggo === 2 &&
         SAVE.data.n.state_starton_dogs === 2 &&
         SAVE.data.n.state_starton_greatdog === 2
      );
   },
   get dead_canine () {
      return world.dead_dog && SAVE.data.n.state_starton_lesserdog === 2;
   },
   /** true if papyrus or sans is dead */
   get dead_skeleton () {
      return SAVE.data.n.state_starton_papyrus === 1 || world.genocide;
   },
   get edgy () {
      return world.genocide || 16 <= SAVE.data.n.kills_wastelands + (SAVE.data.n.state_wastelands_toriel ? 7 : 0);
   },
   get edgy_x () {
      return world.edgy || (world.population_area('s') <= 0 && !world.bullied_area('s'));
   },
   get edgy_xx () {
      return (
         world.edgy_x &&
         (world.dead_skeleton ||
            SAVE.data.n.kills_foundry > 0 ||
            SAVE.data.n.state_foundry_doge === 1 ||
            SAVE.data.n.state_foundry_muffet === 1 ||
            SAVE.data.n.state_foundry_maddummy === 1 ||
            SAVE.data.n.state_foundry_undyne === 2 ||
            SAVE.data.n.kills_aerialis > 0 ||
            SAVE.data.n.state_aerialis_royalguards === 1)
      );
   },
   get edgy_xxx () {
      return (world.population === 0 && !world.bullied) || world.edgy_xx;
   },
   /** true if monster kid should be spawned */
   get kiddo () {
      return (
         (SAVE.data.n.plot > 37.2 && SAVE.data.n.plot < 42) ||
         (world.genocide && SAVE.data.n.plot > 42.1 && SAVE.data.n.plot < 48)
      );
   },
   get flirt_state1 () {
      return [
         SAVE.data.n.state_wastelands_dummy === 6, // dummy
         SAVE.data.n.state_wastelands_napstablook === 1, // napstablook
         SAVE.data.b.cell_flirt, // toriel
         SAVE.data.b.flirt_froggit,
         SAVE.data.b.flirt_whimsun,
         SAVE.data.b.flirt_moldsmal,
         SAVE.data.b.flirt_loox,
         SAVE.data.b.flirt_migosp,
         SAVE.data.b.flirt_mushy,

         SAVE.data.b.flirt_doggo,
         SAVE.data.b.flirt_lesserdog,
         SAVE.data.b.flirt_dogamy,
         SAVE.data.b.flirt_dogaressa,
         SAVE.data.b.flirt_greatdog,
         SAVE.data.b.flirt_papyrus,
         SAVE.data.b.flirt_stardrake,
         SAVE.data.b.flirt_spacetop,
         SAVE.data.b.spared_jerry,
         SAVE.data.b.flirt_mouse,

         SAVE.data.b.flirt_moldbygg,
         SAVE.data.b.flirt_woshua,
         SAVE.data.b.flirt_radtile,
         SAVE.data.b.flirt_shyren,
         SAVE.data.b.flirt_doge,
         SAVE.data.b.flirt_muffet,
         SAVE.data.b.flirt_maddummy,
         SAVE.data.b.flirt_undyne,

         SAVE.data.b.flirt_mettaton,
         SAVE.data.b.flirt_perigee,
         SAVE.data.b.flirt_pyrope,
         SAVE.data.b.flirt_tsundere,
         SAVE.data.b.flirt_rg03,
         SAVE.data.b.flirt_rg04,
         SAVE.data.b.flirt_glyde,

         SAVE.data.b.flirt_madjick,
         SAVE.data.b.flirt_knightknight,
         SAVE.data.b.flirt_froggitex,
         SAVE.data.b.flirt_astigmatism,
         SAVE.data.b.flirt_mushketeer,
         SAVE.data.b.flirt_whimsalot
      ];
   },
   get flirt_state2 () {
      return [ SAVE.data.b.flirt_alphys, SAVE.data.b.flirt_asriel, SAVE.data.b.cell_flirt_asgore ];
   },
   /** whether monsters have been flirted with */
   get flirt () {
      return [ ...world.flirt_state1, ...world.flirt_state2 ].filter(item => item).length;
   },
   /** current room defualt music gain */
   gain (room: string) {
      const score = rooms.of(room).score;
      return (musicRegistry.get(score.music!)?.gain ?? 0) * (score.gain ?? 0);
   },
   /** genocide route calculator */
   get genocide () {
      return SAVE.data.b.genocide && 14 <= SAVE.data.n.plot;
   },
   /** true if goatbro should be spawned */
   get goatbro () {
      return (
         world.genocide &&
         SAVE.data.n.plot > 16.1 &&
         (SAVE.data.n.plot < 28 || SAVE.data.n.plot > 30.1) &&
         (SAVE.data.n.plot < 38.1 || SAVE.data.n.plot > 42.1) &&
         SAVE.data.n.plot < 72
      );
   },
   get happy_ghost () {
      return (
         !world.sad_ghost &&
         !SAVE.data.b.a_state_napstadecline &&
         (SAVE.data.b.napsta_performance ||
            SAVE.data.n.state_foundry_blookdate === 2 ||
            (SAVE.data.b.a_state_hapstablook && 65 <= SAVE.data.n.plot))
      );
   },
   /** kill script */
   kill () {
      const wp = world.population !== 0;
      SAVE.data.n.kills++;
      if (wp) {
         switch (game.room[0]) {
            case 's':
               SAVE.data.n.kills_starton++;
               break;
            case 'f':
               SAVE.data.n.kills_foundry++;
               break;
            case 'a':
               SAVE.data.n.kills_aerialis++;
               break;
         }
         if (ateThreshold()) {
            game.music && (game.music.rate.value = rooms.of(game.room).score.rate * world.ambiance);
         }
      }
   },
   get level () {
      return world.gain(game.room);
   },
   get meanie () {
      return world.trueKills > 9 || SAVE.data.n.bully > 9;
   },
   nootflags: {
      add (flag: string) {
         const f = CosmosUtils.parse<string[]>(SAVE.data.s.nootflags, []);
         f.includes(flag) || f.push(flag);
         SAVE.data.s.nootflags = CosmosUtils.serialize(f);
      },
      has (flag: string) {
         return CosmosUtils.parse<string[]>(SAVE.data.s.nootflags, []).includes(flag);
      }
   },
   population_area (area = game.room[0] || SAVE.data.s.room[0]) {
      switch (area) {
         case 'w':
            return Math.max(16 - (outlandsKills() + SAVE.data.n.bully_wastelands), 0);
         case 's':
            return Math.max(world.popmax(0) - (SAVE.data.n.kills_starton + SAVE.data.n.bully_starton), 0);
         case 'f':
            return Math.max(world.popmax(1) - (SAVE.data.n.kills_foundry + SAVE.data.n.bully_foundry), 0);
         case 'a':
            return Math.max(world.popmax(2) - (SAVE.data.n.kills_aerialis + SAVE.data.n.bully_aerialis), 0);
         case 'c':
            return world.genocide ? 0 : 1;
         default:
            return 1;
      }
   },
   /** local monster population */
   get population () {
      return world.population_area();
   },
   popmax (target: 0 | 1 | 2): number {
      let total = [ 13, 11, 10 ][target];
      while (target > -1) {
         switch (target--) {
            case 0:
               total -= 16 <= outlandsKills() + (SAVE.data.n.bully_wastelands - SAVE.data.n.evac_wastelands) ? 2 : 0;
               break;
            case 1:
               total -=
                  world.popmax(0) <= SAVE.data.n.kills_starton + (SAVE.data.n.bully_starton - SAVE.data.n.evac_starton)
                     ? 2
                     : 0;
               break;
            case 2:
               total -=
                  world.popmax(1) <= SAVE.data.n.kills_foundry + (SAVE.data.n.bully_foundry - SAVE.data.n.evac_foundry)
                     ? 2
                     : 0;
               break;
         }
      }
      return total;
   },
   popmax_area (area = game.room[0] || SAVE.data.s.room[0]) {
      switch (area) {
         case 'w':
            return 16;
         case 's':
            return world.popmax(0);
         case 'f':
            return world.popmax(1);
         case 'a':
            return world.popmax(2);
         case 'c':
            return world.genocide ? 0 : 1;
         default:
            return 1;
      }
   },
   get postnoot () {
      return 6 <= SAVE.flag.n.neutral_twinkly_stage;
   },
   rate (mus = '' as string | CosmosDaemon) {
      typeof mus === 'string' && (mus = musicRegistry.of(rooms.of(mus).score.music!));
      if (
         [
            music.generator,
            music.muscle,
            music.temmie,
            music.temShop,
            music.drone,
            music.youscreweduppal,
            music.barrier,
            music.birds
         ].includes(mus)
      ) {
         return mus?.rate ?? 1;
      } else {
         return (mus?.rate ?? 1) * (ateThreshold() ? 0.5 : antiAteThreshold() ? 0.8 : 1);
      }
   },
   /** if napsta isnt happy with u */
   get sad_ghost () {
      return [ 2, 4 ].includes(SAVE.data.n.state_wastelands_napstablook);
   },
   get scared_ghost () {
      return [ 'f_blooky', 'f_snail', 'f_napstablook' ].includes(SAVE.data.s.state_foundry_deathroom);
   },
   get killed_mushketeer () {
      // include spared state for legacy purposes
      return 67.1 <= SAVE.data.n.plot && !SAVE.data.b.nk_mushketeer && !SAVE.data.b.spared_mushketeer;
   },
   /** true kill counter (pre mettaton fight) */
   get falseKills () {
      return (
         SAVE.data.n.kills +
         SAVE.data.n.corekills +
         (SAVE.data.n.state_wastelands_toriel === 2 ? 1 : 0) +
         (SAVE.data.n.plot > 16.1 && world.genocide ? 1 : 0) +
         (SAVE.data.n.state_starton_doggo === 2 ? 1 : 0) +
         (SAVE.data.n.state_starton_lesserdog === 2 ? 1 : 0) +
         (SAVE.data.n.state_starton_dogs === 2 ? 2 : 0) +
         (SAVE.data.n.state_starton_greatdog === 2 ? 1 : 0) +
         (SAVE.data.n.state_starton_papyrus === 1 ? 1 : 0) +
         (SAVE.data.n.state_foundry_doge === 1 ? 1 : 0) +
         (SAVE.data.n.state_foundry_muffet === 1 ? 1 : 0) +
         (SAVE.data.b.killed_shyren ? 1 : 0) +
         (SAVE.data.n.state_foundry_maddummy === 1 ? 1 : 0) +
         (SAVE.data.n.state_foundry_undyne === 2 ? 1 : 0) +
         (SAVE.data.n.state_aerialis_royalguards > 0 ? 2 : 0) +
         (SAVE.data.b.killed_glyde ? 1 : 0) +
         (SAVE.data.b.killed_madjick ? 1 : 0) +
         (SAVE.data.b.killed_knightknight ? 1 : 0) +
         (world.killed_mushketeer ? 1 : 0)
      );
   },
   /** true kill counter */
   get trueKills () {
      return world.falseKills + (SAVE.data.n.plot > 67.1 && (world.genocide || world.bad_robot) ? 1 : 0);
   }
};

export function activate (source: CosmosHitbox, filter: (hitbox: CosmosHitbox) => boolean) {
   source.calculate();
   for (const key of [ 'below', 'main' ]) {
      for (const { metadata } of renderer.detect(source, ...renderer.calculate(key as OutertaleLayerKey, filter))) {
         if (typeof metadata.name === 'string') {
            events.fire('script', metadata.name, ...((metadata.args ?? []) as string[]));
         }
      }
   }
}

export function ateThreshold (n = 0) {
   if (world.population - n < 6) {
      if (world.genocide) {
         return true;
      }
      switch (game.room[0]) {
         case 'w':
            if (outlandsKills() + n > 16 * (1 / 3)) {
               return true;
            }
            break;
         case 's':
            if (SAVE.data.n.kills_starton + n > world.popmax(0) * (1 / 3)) {
               return true;
            }
            break;
         case 'f':
            if (SAVE.data.n.kills_foundry + n > world.popmax(1) * (1 / 3)) {
               return true;
            }
            break;
         case 'a':
            if (SAVE.data.n.kills_aerialis + n > world.popmax(2) * (1 / 3)) {
               return true;
            }
            break;
      }
   }
   return false;
}

export function antiAteThreshold (n = 0) {
   if (world.population - n < 6) {
      if (world.genocide) {
         return false;
      }
      switch (game.room[0]) {
         case 'w':
            if (SAVE.data.n.bully_wastelands - SAVE.data.n.evac_wastelands + n > 16 * (2 / 3)) {
               return true;
            }
            break;
         case 's':
            if (SAVE.data.n.bully_starton - SAVE.data.n.evac_starton + n > world.popmax(0) * (2 / 3)) {
               return true;
            }
            break;
         case 'f':
            if (SAVE.data.n.bully_foundry - SAVE.data.n.evac_foundry + n > world.popmax(1) * (2 / 3)) {
               return true;
            }
            break;
         case 'a':
            if (SAVE.data.n.bully_aerialis - SAVE.data.n.evac_aerialis + n > world.popmax(2) * (2 / 3)) {
               return true;
            }
            break;
      }
   }
   return false;
}

export function autoNav () {
   return renderer.projection(game.camera, game.camera.position).y < 155 ? 'dialoguerBottom' : 'dialoguerTop';
}

export async function autozoom (zoom: number, time: number) {
   const area = new CosmosValue(320 / renderer.zoom.value);
   function zoomerTicker () {
      renderer.zoom.value = 320 / area.value;
   }
   renderer.on('tick', zoomerTicker);
   await area.modulate(renderer, time, 320 / zoom);
   renderer.off('tick', zoomerTicker);
   renderer.zoom.value = zoom;
}

export function backSprite (map: OutertaleMap, name: string) {
   const handler = {
      priority: -Infinity,
      listener (this: CosmosSprite) {
         const {
            area: { x, y, width, height },
            offset
         } = map.value![`r:${name}`];
         this.crop.top = y;
         this.crop.left = x;
         this.crop.right = -x - width;
         this.crop.bottom = -y - height;
         this.position.set(offset);
         this.off('tick', handler);
      }
   };
   return new CosmosSprite({ frames: [ map.image ] }).on('tick', handler);
}

export function calcAT () {
   if (mechanics.overrideAT !== null) {
      return CosmosUtils.provide(mechanics.overrideAT);
   } else {
      return calcLVX() * 2 + battler.at;
   }
}

export function calcATX (item = SAVE.data.s.weapon) {
   return (
      calcAT() + items.of(item).value + (SAVE.data.s.armor === 'temyarmor' ? mechanics.base_at_temy : mechanics.base_at)
   );
}

export function calcBonusHP () {
   if (mechanics.overrideBonusHP !== null) {
      return CosmosUtils.provide(mechanics.overrideBonusHP);
   } else {
      return Math.max((SAVE.data.b.svr || world.goatbro ? 20 : 10) - (calcLVX() - 1) * 2, 0);
   }
}

export function calcDF () {
   if (mechanics.overrideDF !== null) {
      return CosmosUtils.provide(mechanics.overrideDF);
   } else {
      return Math.floor((calcLVX() - 1) / 4);
   }
}

export function calcDFX (item = SAVE.data.s.armor) {
   return Math.round((calcDF() + items.of(item).value) * -mechanics.df_multiplier);
}

export function calcHP () {
   if (mechanics.overrideHP !== null) {
      return CosmosUtils.provide(mechanics.overrideHP);
   } else if (world.archive) {
      return Infinity;
   } else {
      const lv = calcLVX();
      if (lv === 20) {
         return 99;
      } else {
         return lv * 4 + 16;
      }
   }
}

export function calcLV () {
   let lv = 0;
   for (const expLevel of mechanics.levels) {
      if (expLevel > SAVE.data.n.exp) {
         break;
      }
      lv++;
   }
   return lv + (SAVE.data.b.oops || SAVE.data.n.plot < 13.1 ? 1 : 0);
}

export function calcLVX () {
   return calcLV() || 1;
}

export function calcNX () {
   const value = mechanics.levels[calcLVX() - 1];
   return value ? value - SAVE.data.n.exp : null;
}

/** quick character */
export function character (
   key: string,
   preset: CosmosCharacterPreset,
   position: CosmosPointSimple,
   face: CosmosDirection,
   override = {} as CosmosNot<CosmosCharacterProperties, 'preset' | 'position'>,
   layer = 'main' as OutertaleLayerKey | null
) {
   const instance = new CosmosCharacter(Object.assign({ face, preset, key, position }, override));
   layer === null || renderer.attach(layer, instance);
   return instance;
}

export async function credits (end = true, full = false) {
   const creditsText = new CosmosText({
      anchor: 0,
      position: { x: 160, y: 120 },
      fontName: 'DeterminationMono',
      fontSize: 16,
      fill: '#fff'
   });
   renderer.attach('menu', creditsText);
   let page = 0;
   let bbbb = sounds.impact.instance(renderer);
   while (page !== text.extra.credits.length) {
      creditsText.content = text.extra.credits[page++].join('\n');
      await keys.interactKey.on('down');
      bbbb.stop();
      bbbb = sounds.impact.instance(renderer);
   }
   renderer.detach('menu', creditsText);
   await bbbb.on('stop');
   if (end) {
      await renderer.pause(1000);
      await splash();
      await renderer.pause(2000);
      full ? reload_full(true) : reload(false, true);
   }
}

export function deAllB () {
   for (const ob of renderer.layers.menu.objects) {
      if (typeof ob.metadata.bullet === 'boolean') {
         renderer.detach('menu', ob);
      }
   }
   for (const ob of battler.bullets.objects) {
      if (typeof ob.metadata.bullet === 'boolean') {
         battler.bullets.detach(ob);
      }
   }
}

export function displayTime (value: number) {
   const seconds = value / 30;
   return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0')}`;
}

export function distanceGravity (v: number, d: number) {
   if (d === 0) {
      return 0;
   } else {
      return v ** 2 / (v + d * 2);
   }
}

/** smart dialogue system */
export async function dialogue (nav: string, ...lines: string[]) {
   if (lines.length > 0) {
      if (dialogueSession.active) {
         typer.reset(true);
      } else {
         dialogueSession.movement = game.movement;
      }
      dialogueSession.active = true;
      game.movement = false;
      const trueNavigator = nav === 'auto' ? autoNav() : nav;
      atlas.target === trueNavigator || atlas.switch(trueNavigator);
      game.text = '';
      const t = typer.text(...lines);
      t.then(() => {
         atlas.switch(null);
         dialogueSession.active = false;
         dialogueSession.movement && (game.movement = true);
      });
      await t;
   }
}

export async function dialogue_primitive (...lines: string[]) {
   game.text = '';
   await typer.text(...lines);
}

export function disengageDelay () {
   return soundDelay.modulate(renderer, 500 * (soundDelay.value / 0.5), 0);
}

/** useful for a surprising number of things */
export async function dropShake (simple: CosmosPointSimple, sfx = true) {
   sfx && sounds.noise.instance(renderer);
   const base = simple.x;
   simple.x = base + 3;
   await renderer.pause(66);
   simple.x = base - 3;
   await renderer.pause(66);
   simple.x = base + 2;
   await renderer.pause(66);
   simple.x = base - 1;
   await renderer.pause(66);
   simple.x = base;
}

export function easyRoom (name: string, map: OutertaleMap, decorator: OutertaleRoomDecorator) {
   const extras: CosmosAsset[] = [];
   rooms.register(
      name,
      new OutertaleRoom({
         decorator,
         face: decorator.face as CosmosDirection,
         layers: Object.fromEntries(
            Object.entries(decorator.layers ?? {}).map(([ layer, objects = [] ]) => [
               layer,
               [
                  ...(layer === decorator.background ? [ backSprite(map, name) ] : []),
                  ...(layer in (decorator.mixins ?? {}) ? [ backSprite(maps.of(decorator.mixins![layer]!), name) ] : []),
                  ...objects.map(decorator => {
                     const {
                        attachments = [],
                        barriers = [],
                        filters: filterList = [],
                        interacts = [],
                        position,
                        rotation,
                        tags = [],
                        triggers = []
                     } = decorator;
                     return new CosmosObject({
                        filters: filterList
                           .filter(filter => filter in filters)
                           .map(filter => filters[filter as keyof typeof filters]),
                        metadata: { class: 'object', decorator, tags: tags.slice() },
                        position,
                        rotation,
                        objects: [
                           ...attachments.map(decorator => {
                              const {
                                 anchor,
                                 active = false,
                                 filters: filterList = [],
                                 frames = [],
                                 position,
                                 resources,
                                 rotation,
                                 steps: duration,
                                 type
                              } = decorator;
                              if (type === 'sprite') {
                                 return new CosmosSprite({
                                    anchor,
                                    active,
                                    filters: filterList
                                       .filter(filter => filter in filters)
                                       .map(filter => filters[filter as keyof typeof filters]),
                                    frames: frames.map(frame => {
                                       const extra = content[frame as keyof typeof content] as CosmosImage;
                                       extras.push(extra);
                                       return extra;
                                    }),
                                    metadata: { class: 'attachment', decorator },
                                    position,
                                    rotation,
                                    duration
                                 });
                              } else {
                                 const extra = content[resources as keyof typeof content] as CosmosAnimationResources;
                                 extras.push(extra);
                                 return new CosmosAnimation({
                                    anchor,
                                    active,
                                    filters: filterList
                                       .filter(filter => filter in filters)
                                       .map(filter => filters[filter as keyof typeof filters]),
                                    metadata: { class: 'attachment', decorator },
                                    resources: extra,
                                    position,
                                    rotation
                                 });
                              }
                           }),
                           ...barriers.map(decorator => {
                              const { anchor, position, rotation, size } = decorator;
                              return new CosmosHitbox({
                                 anchor,
                                 metadata: { barrier: true, class: 'barrier', decorator },
                                 position,
                                 rotation,
                                 size
                              });
                           }),
                           ...interacts.map(decorator => {
                              const { anchor, args = [], name, position, rotation, size } = decorator;
                              return new CosmosHitbox({
                                 anchor,
                                 metadata: {
                                    args: args.slice(),
                                    class: 'interact',
                                    decorator,
                                    interact: true,
                                    name
                                 },
                                 position,
                                 rotation,
                                 size
                              });
                           }),
                           ...triggers.map(decorator => {
                              const { anchor, args = [], name, position, rotation, size } = decorator;
                              return new CosmosHitbox({
                                 anchor,
                                 metadata: { args, class: 'trigger', decorator, name, trigger: true },
                                 position,
                                 rotation,
                                 size
                              });
                           })
                        ]
                     });
                  })
               ]
            ])
         ),
         metadata: decorator.metadata,
         neighbors: decorator.neighbors?.slice(),
         preload: new CosmosInventory(
            ...([
               ...[ ...new Set([ map, ...Object.values(decorator.mixins ?? {}).map(key => maps.of(key!)) ]) ],
               ...extras,
               ...(decorator.preload ?? []).map(asset =>
                  asset[0] === '#'
                     ? maps.of(asset.slice(1))
                     : content[asset as keyof typeof content] || inventories[asset as keyof typeof inventories]
               ),
               ...(Object.values(decorator.layers ?? {})
                  .flat(1)
                  .find(x => x?.tags?.includes('spawn'))
                  ? [ content.asSave ]
                  : [])
            ].filter(asset => asset instanceof CosmosAsset) as CosmosAsset[])
         ),
         region: decorator.region?.slice() as CosmosRegion | [],
         score: decorator.score,
         spawn: decorator.spawn
      })
   );
   rooms.of(name).preload.name = `rooms::${name}`;
}

export async function elevate (long = false) {
   sounds.bell.instance(renderer);
   const blockbox = new CosmosHitbox({ metadata: { barrier: true }, size: { x: 40, y: 20 } });
   const blocker = new CosmosObject({
      fill: '#000',
      position: { x: 140, y: 220 },
      priority: 1000,
      objects: [
         new CosmosRectangle({ alpha: 0, size: { x: 40, y: 20 } }),
         new CosmosRectangle({ size: { y: 20 } }),
         new CosmosRectangle({ anchor: { x: 1 }, position: { x: 40 }, size: { y: 20 } }),
         blockbox
      ]
   });
   renderer.attach('main', blocker);
   await Promise.all([
      blocker.objects[0].alpha.modulate(renderer, 400, 1),
      (blocker.objects[1] as CosmosRectangle).size.modulate(renderer, 400, { x: 20 }),
      (blocker.objects[2] as CosmosRectangle).size.modulate(renderer, 400, { x: 20 })
   ]);
   sounds.pathway.instance(renderer);
   shake(1, 300);
   await renderer.pause(400);
   long ? sounds.long_elevator.instance(renderer) : sounds.elevator.instance(renderer);
   await renderer.shake.modulate(renderer, long ? 600 : 300, 0.5);
   await renderer.shake.modulate(renderer, long ? 16400 : 2400, 1.5);
   await renderer.shake.modulate(renderer, long ? 1600 : 800, renderer.shake.value, 0);
   await renderer.pause(400);
   sounds.bell.instance(renderer);
   await Promise.all([
      blocker.objects[0].alpha.modulate(renderer, 400, 0),
      (blocker.objects[1] as CosmosRectangle).size.modulate(renderer, 400, { x: 0 }),
      (blocker.objects[2] as CosmosRectangle).size.modulate(renderer, 400, { x: 0 })
   ]);
   renderer.detach('main', blocker);
   sounds.pathway.instance(renderer);
   blockbox.metadata.barrier = false;
   shake(1, 300);
   if (long) {
      SAVE.data.n.plot = 69;
   }
}

export function engageDelay () {
   return soundDelay.modulate(renderer, 33, 0.5);
}

export function epilogue () {
   if (SAVE.data.b.svr) {
      return music.uwa.instance(renderer);
   } else {
      const mus = music.reunited.instance(renderer);
      mus.rate.value = SAVE.flag.n.pacifist_marker_bully > 3 ? 0.4 : 1;
      return mus;
   }
}

export function fader (properties: CosmosSizedObjectProperties = {}, layer: OutertaleLayerKey | null = 'menu') {
   const object = new CosmosRectangle(Object.assign({ alpha: 0, fill: '#000', size: { x: 320, y: 240 } }, properties));
   layer && renderer.attach(layer, object);
   return object;
}

export function fastAssets () {
   const assets = [ rooms.of(SAVE.data.s.room).preload ] as CosmosAsset[];
   SAVE.data.n.plot === 72 &&
      !SAVE.data.b.freedom &&
      assets.push(SAVE.data.b.svr ? inventories.svrAssets : content.amReunited);
   world.genocide && assets.push(inventories.asrielAssets);
   world.kiddo && assets.push(inventories.kiddAssets);
   SAVE.data.n.plot === 47.2 && assets.push(inventories.chaseAssets);
   SAVE.data.n.plot === 70 && SAVE.data.b.armaloop && assets.push(content.amApproach);
   SAVE.data.n.plot === 71 && SAVE.data.b.choiceloop && assets.push(content.amThechoice);
   SAVE.data.n.plot === 71.2 &&
      SAVE.data.n.exp <= 0 &&
      2.1 <= SAVE.data.n.plot_date &&
      assets.push(inventories.alphysAssets);
   return assets;
}

/** all loaded characters */
export function fetchCharacters () {
   return renderer.layers.main.objects.filter(object => object instanceof CosmosCharacter) as CosmosCharacter[];
}

export function quickresume (fade = false) {
   resume({ gain: world.level, rate: world.ambiance, fade });
}

/** listen for specific header */
export function header (target: string) {
   return new Promise<void>(resolve => {
      const listener = (header: string) => {
         if (header === target) {
            typer.off('header', listener);
            resolve();
         }
      };
      typer.on('header', listener);
   });
}

export function heal (amount = world.archive ? 0 : Infinity, sfx: CosmosDaemon | boolean = true, vfx = false) {
   if (amount < 0) {
      sfx && sounds.hurt.instance(renderer);
      SAVE.data.n.hp = Math.max(SAVE.data.n.hp + amount, 0);
      if (SAVE.data.n.hp === 0) {
         battler.active ||
            battler.SOUL.position.set(renderer.projection(player.position.subtract(0, 15), game.camera.position));
         battler.defeat();
      }
   } else {
      sfx && (sfx === true ? sounds.heal : sfx).instance(renderer);
      SAVE.data.n.hp = Math.max(SAVE.data.n.hp, Math.min(SAVE.data.n.hp + amount, calcHP()));
      if (vfx) {
         atlas.navigators.of('battlerAdvanced').objects[3].objects[1].metadata.sparkleshadow = true;
         sounds.asrielSparkle.instance(renderer).rate.value = 1.5;
      }
   }
}

/** get a single instance */
export function instance (layer: OutertaleLayerKey, tag: string) {
   return instances(layer, tag).next().value;
}

/** get instances */
export function * instances (layer: OutertaleLayerKey, tag: string) {
   for (const object of renderer.layers[layer].objects.slice()) {
      const tags = object.metadata.tags;
      if (tags instanceof Array && tags.includes(tag)) {
         yield {
            destroy: () => renderer.detach(layer, object),
            set index (value: number) {
               (object.objects[0] as CosmosSprite).index = value;
            },
            talk: async (
               tag: string,
               provider: ((top: CosmosObject) => CosmosSprite) | null,
               navigator: string,
               ...lines: string[]
            ) => {
               const anim = provider?.(object) ?? null;
               const listener = (header: string) => {
                  if (anim !== null) {
                     if (header === `npc/${tag}`) {
                        speech.targets.add(anim);
                     } else if (header === 'npc') {
                        speech.targets.delete(anim);
                     }
                  }
               };
               typer.on('header', listener);
               await dialogue(navigator, ...lines);
               typer.off('header', listener);
               anim === null || speech.targets.delete(anim);
            },
            tags,
            object
         };
      }
   }
}

export function interactionCheck (target: CosmosHitbox) {
   return (player.objects[1] as CosmosHitbox).calculate().detect(target.calculate());
}

export function keepActive (this: CosmosSprite) {
   this.active = true;
}

export function menuText (
   x: number,
   y: number,
   c: () => string,
   properties: CosmosTextProperties = {},
   white?: boolean
) {
   return new CosmosText(
      Object.assign(
         { fill: white === false ? void 0 : '#fff', position: { x: x / 2, y: y / 2 }, stroke: '' },
         properties
      )
   ).on('tick', function () {
      this.content = CosmosUtils.provide(c);
   });
}

export function menuBox (
   x: number,
   y: number,
   w: number,
   h: number,
   b: number,
   properties: CosmosSizedObjectProperties = {}
) {
   const post = new CosmosPoint(b).add(x, y);
   const crop = { top: post.y, left: post.x, right: -post.x - w, bottom: -post.y - h };
   return new CosmosRectangle({
      fill: '#fff',
      position: { x: x / 2, y: y / 2 },
      size: { x: w / 2 + b, y: h / 2 + b },
      stroke: '',
      objects: [
         new CosmosRectangle({ fill: '#000', position: b / 2, size: { x: w / 2, y: h / 2 } }),
         new CosmosSprite({
            frames: [ content.ieSplashBackground ],
            crop,
            position: b / 2,
            scale: 0.5
         }).on('tick', function () {
            this.alpha.value = world.archive || game.room[0] === '_' ? 0 : 0.25;
         }),
         new CosmosObject(Object.assign({ fill: '#000', position: { x: b / 2, y: b / 2 } }, properties))
      ]
   });
}

export function menuFinder (nav: string, navX: CosmosProvider<any>, navY?: CosmosProvider<number>) {
   if (atlas.target === nav) {
      const navigator = atlas.navigator();
      if (navigator) {
         const navYv = CosmosUtils.provide(navY);
         if (typeof navYv === 'number') {
            if (navigator.position.x === CosmosUtils.provide(navX) && navigator.position.y === navYv) {
               return true;
            }
         } else if (navigator.selection() === CosmosUtils.provide(navX)) {
            return true;
         }
      }
   }
}

export function menuSOUL (x: number, y: number, nav: string, navX: CosmosProvider<any>, navY?: CosmosProvider<number>) {
   return new CosmosSprite({
      frames: [ content.ieSOUL ],
      position: { x: x / 2, y: y / 2 },
      priority: 1
   }).on('tick', function () {
      this.alpha.value = menuFinder(nav, navX, navY) ? 1 : 0;
   });
}

/** quick notifier */
export async function notifier (
   object: CosmosObject,
   sfx = true,
   hy = object instanceof CosmosEntity
      ? object.sprite.compute().y
      : object instanceof CosmosSprite
      ? object.compute().y
      : 0,
   offset = () => ({ x: 0, y: 0 })
) {
   sfx && sounds.notify.instance(renderer);
   const anim = new CosmosAnimation({
      anchor: { x: 0, y: 1 },
      resources: content.ibuNotify
   }).on('pre-render', function () {
      this.position.set(renderer.projection(object.position.subtract(0, hy + 3)).add(offset()));
   });
   renderer.attach('menu', anim);
   await renderer.pause(650);
   renderer.detach('menu', anim);
}

/** oops */
export function oops () {
   if (!SAVE.data.b.oops) {
      SAVE.data.b.oops = true;
      if (13.1 <= SAVE.data.n.plot) {
         new CosmosDaemon(content.asOops, { context, gain: 0.2, rate: 0.92, router: soundRouter }).instance(renderer);
      }
   }
}

export function outlandsKills () {
   return SAVE.data.n.plot < 16 ? Math.min(SAVE.data.n.kills, 16) : SAVE.data.n.kills_wastelands;
}

/** prime radiant */
export function rand_rad (value = Math.random()) {
   return new CosmosValueRandom(hashes.of(value.toString()));
}

/** genocide post-milestone repeatability */
export function resetThreshold () {
   if (world.postnoot) {
      return 0;
   } else {
      switch (SAVE.flag.n.genocide_milestone) {
         case 0:
            return 1 <= SAVE.flag.n.killed_sans ? 8 : Infinity;
         case 1:
            return 4;
         case 2:
         case 3:
            return 2;
         default:
            return 1;
      }
   }
}

/** resume music */
export function resume ({ gain = 1, rate = 1, fade = true }) {
   game.music?.stop();
   const score = rooms.of(game.room).score;
   const daemon = typeof score.music === 'string' ? musicRegistry.of(score.music) : null;
   game.music = daemon?.instance(renderer, { offset: game.music_offset }) ?? null;
   game.music_offset = 0;
   musicFilter.value = score.filter;
   if (game.music) {
      game.music.gain.value = gain / 4;
      game.music.gain.modulate(renderer, fade ? 300 : 0, gain);
      game.music.rate.value = score.rate * rate;
   }
   musicConvolver.value = score.reverb;
}

/** detect kill count in specific room */
export function roomKills () {
   return new Proxy(CosmosUtils.parse<CosmosKeyed<number>>(SAVE.data.s.room_kills, {}), {
      get (target, key) {
         if (typeof key === 'string') {
            return target[key] ?? 0;
         }
      },
      set (target, key, value) {
         if (typeof key === 'string') {
            target[key] = value;
            SAVE.data.s.room_kills = CosmosUtils.serialize(target);
            return true;
         } else {
            return false;
         }
      }
   });
}

export async function roomReaction (roomMap: CosmosKeyed<(x: () => void) => void | Promise<void>>) {
   if (game.room in roomMap) {
      const b = SAVE.data.n.bully;
      const k = world.trueKills;
      await events.on('battle-exit');
      if (world.trueKills > k) {
         events.fire('tick');
         let m = false;
         const move = battler.encounter_state.movement;
         const x = () => {
            m = true;
            battler.encounter_state.movement = false;
         };
         await roomMap[game.room](x);
         events.fire('tick');
         m && move && (game.movement = true);
      } else if (SAVE.data.n.bully > b) {
         events.fire('tick');
      }
   }
}

/** saw mapper */
export function sawWaver (time: number, period: number, from: number, to: number, phase = 0, ct = renderer.time) {
   return CosmosMath.linear((((ct - time) % period) / period + phase) % 1, from, to, from);
}

export function selectText (input: string[][]) {
   if (input.length < 2) {
      return input[0];
   } else {
      return input[rng.dialogue.int(input.length)];
   }
}

/** sine mapper */
export function sineWaver (time: number, period: number, from: number, to: number, phase = 0, ct = renderer.time) {
   return CosmosMath.remap(CosmosMath.wave(((ct - time + phase * period) % period) / period), from, to);
}

export async function splash () {
   const foreground = new CosmosSprite({
      alpha: 0,
      blend: BLEND_MODES.ADD,
      frames: [ content.ieSplashForeground ],
      position: { y: -60 },
      priority: 1
   });
   renderer.attach('menu', foreground);
   sounds.splash.instance(renderer);
   await Promise.all([
      foreground.alpha.modulate(renderer, 1000, 0, 0, 1),
      foreground.position.modulate(renderer, 1000, 0, 0, 0)
   ]);
   const background = new CosmosSprite({
      anchor: 0,
      position: { x: 160, y: 120 },
      alpha: 0,
      frames: [ content.ieSplashBackground ],
      scale: 0.5
   });
   renderer.attach('menu', background);
   background.alpha.modulate(renderer, 2000, 0, 1, 1);
   await renderer.pause(1400);
   const fd = fader({ fill: '#fff' });
   await fd.alpha.modulate(renderer, 2500, 0, 0, 1);
   renderer.detach('menu', foreground, background);
   await fd.alpha.modulate(renderer, 300, 0);
   renderer.detach('menu', fd);
}

/** quicker shadow func */
export function quickshadow (
   spr: CosmosSprite,
   position: Partial<CosmosPointSimple> | number = spr,
   parent: OutertaleLayerKey | CosmosObject = 'menu',
   alpha = 0.6,
   alphaDecay = 1.5,
   alphaThreshold = 0.2,
   ticker = (spr: CosmosSprite) => false
) {
   const e = CosmosUtils.hyperpromise();
   const s = new CosmosSprite({
      alpha,
      anchor: spr.anchor,
      crop: spr.crop,
      parallax: spr.parallax,
      position,
      priority: spr.priority.value,
      rotation: spr.rotation.value,
      scale: spr.scale,
      frames: [ spr.frames[spr.index] ],
      metadata: { e }
   })
      .on('tick', function () {
         (ticker(this) || (this.alpha.value /= alphaDecay) < alphaThreshold) && e.resolve();
      })
      .on('render', function () {
         SAVE.flag.b.$option_fancy || e.resolve();
      });
   renderer.post().then(() => {
      e.active && (typeof parent === 'string' ? renderer.attach(parent, s) : parent.attach(s));
   });
   e.promise.then(() => {
      typeof parent === 'string' ? renderer.detach(parent, s) : parent.detach(s);
   });
   return s;
}

export async function saveSelector () {
   const y = 97.5;
   const baseColor = '#808080';
   const highlightColor = '#ffffff';
   const saveSelectorAssets = new CosmosInventory(
      content.ieSplashBackground,
      maps.of('_').image,
      maps.of('_'),
      content.amRedacted,
      content.asMenu,
      content.asSelect
   );
   saveSelectorAssets.name = 'saveSelectorAssets';
   const reverb = new CosmosEffect(context, convolver, 1);
   reverb.connect(context);
   const audios = {
      redacted: new CosmosDaemon(content.amRedacted, {
         context,
         loop: true,
         gain: music.redacted.gain * 2,
         rate: music.redacted.rate * 0.1,
         router: effectSetup(reverb, input => {
            input.connect(reverb.input);
            input.connect(reverb.throughput);
         })
      }),
      menu: new CosmosDaemon(content.asMenu, {
         context,
         gain: sounds.menu.gain * 0.8,
         rate: sounds.menu.rate
      }),
      select: new CosmosDaemon(content.asSelect, {
         context,
         gain: sounds.select.gain * 0.8,
         rate: sounds.select.rate
      })
   };
   const timelines = {
      get bisect () {
         return saveAtlas.navigators.of('timeline').selection() === 'bisect';
      },
      name: '',
      list: CosmosUtils.parse<[number, string][]>(SAVE.manager.getItem(SAVE.timelines), []),
      get selection () {
         return saveAtlas.navigators.of('timelines').selection();
      },
      delete () {
         const namespace = timelines.namespace();
         SAVE.manager.removeItem(namespace);
         for (const key of SAVE.keys()) {
            key.startsWith(namespace) && SAVE.manager.removeItem(key);
         }
         timelines.list.splice(timelines.selection, 1);
         timelines.save();
      },
      namespace (index?: number) {
         return `TIMELINES~${index ?? timelines.list[timelines.selection][0]}`;
      },
      rename () {
         if (timelines.name) {
            if (hashes.of(timelines.name.toLowerCase()) === 670987361852517) {
               return 'next';
            } else if (timelines.selection === -1 || timelines.bisect) {
               let index = 0;
               const indices = timelines.list.map(value => value[0]);
               while (indices.includes(index)) {
                  index++;
               }
               timelines.list.push([ index, timelines.name ]);
               if (timelines.bisect) {
                  const namespace1 = timelines.namespace();
                  const namespace2 = timelines.namespace(index);
                  for (const key of SAVE.keys()) {
                     key.startsWith(namespace1) &&
                        SAVE.manager.setItem(namespace2 + key.slice(namespace1.length), SAVE.manager.getItem(key)!);
                  }
               }
               timelines.save();
               return 'timeline';
            } else {
               timelines.list[timelines.selection][1] = timelines.name;
               timelines.save();
               return 'timelines';
            }
         }
      },
      save () {
         SAVE.manager.setItem(SAVE.timelines, CosmosUtils.serialize(timelines.list));
      }
   };
   const glitch = filters.glitch;
   const saveRenderer = new CosmosRenderer({
      auto: false,
      area: new Rectangle(0, 0, 640, 480),
      alpha: 0,
      wrapper: '#wrapper',
      layers: { below: [], main: [], menu: [] },
      width: 640,
      height: 480,
      scale: 2,
      position: { x: 160, y: 120 },
      filters: [ filters.crt ]
   });
   saveRenderer.on('tick', { priority: -Infinity, listener: gamepadder.update });
   const mat = new ColorMatrixFilter();
   mat.blackAndWhite(false);
   const room = new CosmosObject({
      area: saveRenderer.area,
      metadata: { fx: -Infinity },
      objects: [ rooms.of('_').layers.below![0] ],
      filters: [ mat ]
   }).on('tick', function () {
      if (this.metadata.fx > saveRenderer.time - 200) {
         this.filters!.length < 2 && this.filters!.push(glitch);
         glitch.refresh();
      } else {
         this.filters!.length > 1 && this.filters!.pop();
      }
   });
   const next = new CosmosNavigator();
   const namerange = namerangeGen();
   const saveAtlas: CosmosAtlas<string> = new CosmosAtlas<string>({
      next,
      main: new CosmosNavigator<string>({
         grid: [ [ 'next', 'timelines' ] ],
         objects: [
            new CosmosRectangle({
               position: { x: 160, y },
               anchor: 0,
               size: { x: 280, y: 50 },
               objects: [
                  new CosmosText({
                     fontName: 'DeterminationMono',
                     fontSize: 16,
                     anchor: 0,
                     content: text.timeline.main
                  })
               ]
            }).on('tick', function () {
               if (saveAtlas.target === 'main' && saveAtlas.navigator()?.selection() === 'next') {
                  this.stroke = this.objects[0].fill = highlightColor;
               } else {
                  this.stroke = this.objects[0].fill = baseColor;
               }
            }),
            new CosmosRectangle({
               position: { x: 160, y: y + 55 },
               anchor: 0,
               size: { x: 200, y: 40 },
               objects: [
                  new CosmosText({
                     fontName: 'DeterminationMono',
                     fontSize: 16,
                     anchor: 0,
                     content: text.timeline.timelines
                  }).on('tick', function () {
                     this.alpha.value = saveAtlas.target === 'main' ? 1 : 0;
                  })
               ]
            }).on('tick', function () {
               if (saveAtlas.target === 'rename') {
                  this.stroke = highlightColor;
                  this.objects[0].fill = baseColor;
               } else if (saveAtlas.target === 'main' && saveAtlas.navigator()?.selection() === 'timelines') {
                  this.stroke = this.objects[0].fill = highlightColor;
               } else {
                  this.stroke = this.objects[0].fill = baseColor;
               }
            })
         ],
         next (self) {
            return self.selection();
         }
      }).on('change', function () {
         audios.menu.instance(saveRenderer);
      }),
      timelines: new CosmosNavigator<string>({
         grid () {
            return [ [ ...timelines.list.keys(), -1 ] ];
         },
         flip: true,
         prev: 'main',
         next (self) {
            if (self.selection() === -1) {
               if (isMobile.any) {
                  timelines.name = (prompt(text.timeline.placeholder, '') ?? '')
                     .split('')
                     .filter(char => namerange.includes(char))
                     .join('')
                     .slice(0, 21);
                  if (timelines.rename() === 'next') {
                     return 'next';
                  }
               } else {
                  return 'rename';
               }
            } else {
               return 'timeline';
            }
         },
         objects: [
            new CosmosText({
               position: { x: 160 },
               anchor: 0,
               fontName: 'DeterminationMono',
               fontSize: 16
            }).on('tick', function () {
               if (saveAtlas.target === 'rename') {
                  this.position.y = y + 55;
                  this.content = timelines.name || text.timeline.placeholder;
               } else if (saveAtlas.target === 'delete') {
                  this.position.y = y + 47.5;
                  this.content = text.timeline.confirm;
               } else if (timelines.selection === -1) {
                  this.position.y = y + 55;
                  this.content = text.timeline.create;
               } else {
                  this.position.y = y + 47.5;
                  this.content = timelines.list[timelines.selection][1];
               }
               if (saveAtlas.target === 'rename') {
                  this.fill = timelines.name ? highlightColor : baseColor;
               } else if (saveAtlas.target === 'delete' || saveAtlas.target === 'timelines') {
                  this.fill = highlightColor;
               } else {
                  this.fill = baseColor;
               }
            }),
            new CosmosText({
               position: { x: 100, y: y + 62.5 },
               anchor: 0,
               fontName: 'CryptOfTomorrow',
               fontSize: 9,
               content: text.timeline.launch
            }).on('tick', function () {
               if (
                  (saveAtlas.target === 'timelines' && saveAtlas.navigator()?.selection() === -1) ||
                  saveAtlas.target === 'rename' ||
                  saveAtlas.target === 'delete'
               ) {
                  this.alpha.value = 0;
               } else {
                  this.alpha.value = 1;
                  if (saveAtlas.target === 'timeline' && saveAtlas.navigator()?.selection() === 'next') {
                     this.fill = highlightColor;
                  } else {
                     this.fill = baseColor;
                  }
               }
            }),
            new CosmosText({
               position: { x: 140, y: y + 62.5 },
               anchor: 0,
               fontName: 'CryptOfTomorrow',
               fontSize: 9,
               content: text.timeline.rename
            }).on('tick', function () {
               if (
                  (saveAtlas.target === 'timelines' && saveAtlas.navigator()?.selection() === -1) ||
                  saveAtlas.target === 'rename' ||
                  saveAtlas.target === 'delete'
               ) {
                  this.alpha.value = 0;
               } else {
                  this.alpha.value = 1;
                  if (saveAtlas.target === 'timeline' && saveAtlas.navigator()?.selection() === 'rename') {
                     this.fill = highlightColor;
                  } else {
                     this.fill = baseColor;
                  }
               }
            }),
            new CosmosText({
               position: { x: 180, y: y + 62.5 },
               anchor: 0,
               fontName: 'CryptOfTomorrow',
               fontSize: 9,
               content: text.timeline.bisect
            }).on('tick', function () {
               if (
                  (saveAtlas.target === 'timelines' && saveAtlas.navigator()?.selection() === -1) ||
                  saveAtlas.target === 'rename' ||
                  saveAtlas.target === 'delete'
               ) {
                  this.alpha.value = 0;
               } else {
                  this.alpha.value = 1;
                  if (saveAtlas.target === 'timeline' && saveAtlas.navigator()?.selection() === 'bisect') {
                     this.fill = highlightColor;
                  } else {
                     this.fill = baseColor;
                  }
               }
            }),
            new CosmosText({
               position: { x: 220, y: y + 62.5 },
               anchor: 0,
               fontName: 'CryptOfTomorrow',
               fontSize: 9,
               content: text.timeline.delete
            }).on('tick', function () {
               if (
                  (saveAtlas.target === 'timelines' && saveAtlas.navigator()?.selection() === -1) ||
                  saveAtlas.target === 'rename' ||
                  saveAtlas.target === 'delete'
               ) {
                  this.alpha.value = 0;
               } else {
                  this.alpha.value = 1;
                  if (saveAtlas.target === 'timeline' && saveAtlas.navigator()?.selection() === 'delete') {
                     this.fill = highlightColor;
                  } else {
                     this.fill = baseColor;
                  }
               }
            }),
            new CosmosText({
               position: { x: 70, y: y + 55 },
               anchor: 0,
               fontName: 'DeterminationMono',
               fontSize: 16,
               content: '<'
            }).on('tick', function () {
               if (saveAtlas.target === 'timelines') {
                  this.alpha.value = 1;
                  if (saveAtlas.navigator()?.position.y === 0) {
                     this.fill = baseColor;
                  } else {
                     this.fill = highlightColor;
                  }
               } else {
                  this.alpha.value = 0;
               }
            }),
            new CosmosText({
               position: { x: 250, y: y + 55 },
               anchor: 0,
               fontName: 'DeterminationMono',
               fontSize: 16,
               content: '>'
            }).on('tick', function () {
               if (saveAtlas.target === 'timelines') {
                  this.alpha.value = 1;
                  if (timelines.selection === -1) {
                     this.fill = baseColor;
                  } else {
                     this.fill = highlightColor;
                  }
               } else {
                  this.alpha.value = 0;
               }
            })
         ]
      })
         .on('change', function () {
            audios.menu.instance(saveRenderer);
         })
         .on('from', function (target) {
            select();
            target === 'main' && saveAtlas.attach(saveRenderer, 'main', 'timelines');
         })
         .on('to', function (target) {
            target === 'main' && saveAtlas.detach(saveRenderer, 'main', 'timelines');
         }),
      timeline: new CosmosNavigator<string>({
         grid: [ [ 'next', 'rename', 'bisect', 'delete' ] ],
         flip: true,
         prev: 'timelines',
         next (self) {
            const selection = self.selection();
            const selectionTarget = selection === 'bisect' ? 'rename' : selection;
            if (selectionTarget === 'rename' && isMobile.any) {
               timelines.name = (
                  prompt(
                     text.timeline.placeholder,
                     selection === 'bisect' ? '' : timelines.list[timelines.selection][1]
                  ) ?? ''
               )
                  .split('')
                  .filter(char => namerange.includes(char))
                  .join('')
                  .slice(0, 21);
               if (timelines.rename() === 'next') {
                  return 'next';
               }
            } else {
               return selectionTarget;
            }
         }
      })
         .on('change', function () {
            audios.menu.instance(saveRenderer);
         })
         .on('from', function (target) {
            target === 'timelines' && select();
            this.position = { x: 0, y: 0 };
         }),
      rename: new CosmosNavigator<string>({
         prev () {
            return timelines.selection === -1 ? 'timelines' : 'timeline';
         },
         next () {
            return timelines.rename();
         },
         objects: [
            new CosmosText({
               anchor: 0,
               position: { x: 160, y: 196 },
               fontName: 'DeterminationMono',
               fontSize: 16,
               fill: '#808080',
               content: text.timeline.instruction
            }),
            new CosmosText({
               anchor: 0,
               position: { x: 160, y: 210 },
               fontName: 'DeterminationMono',
               fontSize: 8,
               fill: '#ffffff'
            }).on('tick', function () {
               this.content = gamepadder.mappings === null ? '' : text.timeline.instruction_gamepad;
            })
         ]
      })
         .on('from', function (target) {
            target === 'rename_gamepad' || select();
            timelines.name =
               timelines.selection === -1 || timelines.bisect ? '' : timelines.list[timelines.selection][1];
            saveAtlas.attach(saveRenderer, 'menu', 'rename');
            addEventListener('keydown', keydownListener);
            if (gamepadder.gamepad !== null) {
               let primed = true;
               saveAtlas.navigators
                  .of('rename')
                  .on('to')
                  .then(() => (primed = false));
               gamepadder.down(saveRenderer, gamepadder.controls(gamepadder.gamepad)).then(() => {
                  primed && saveAtlas.switch('rename_gamepad');
               });
            }
         })
         .on('to', function () {
            removeEventListener('keydown', keydownListener);
            saveAtlas.detach(saveRenderer, 'menu', 'rename');
         }),
      rename_gamepad: new CosmosNavigator({
         flip: true,
         grid: [ ...text.menu.name5, [ 'quit', 'backspace', 'done' ] ],
         next (self) {
            const selection = self.selection() as string;
            switch (selection) {
               case 'quit':
                  return 'rename';
               case 'backspace':
                  timelines.name.length > 0 && (timelines.name = timelines.name.slice(0, -1));
                  break;
               case 'done':
                  return timelines.rename();
               default:
                  if (timelines.name.length < 21) {
                     timelines.name += selection;
                  } else {
                     timelines.name = timelines.name.slice(0, 20) + selection;
                  }
            }
         },
         prev () {
            timelines.name.length > 0 && (timelines.name = timelines.name.slice(0, -1));
         },
         objects: [
            new CosmosRectangle({
               fill: '#000000cf',
               size: { x: 320, y: 240 },
               fontName: 'DeterminationSans',
               fontSize: 16,
               objects: [
                  menuText(320, 68 - 4, () => text.timeline.placeholder, { anchor: { x: 0 } }),
                  menuText(320, 118 - 4, () => timelines.name, { anchor: { x: 0 } }),
                  ...namerange.map((letter, index) => {
                     const { x, y } = text.menu.name6(index);
                     return menuText(
                        x,
                        y - 4,
                        () =>
                           `§fill:${
                              saveAtlas.target === 'rename_gamepad' && saveAtlas.navigator()?.selection() === letter
                                 ? '#ff0'
                                 : '#fff'
                           }§${letter}`
                     );
                  }),
                  menuText(
                     120,
                     408 - 4,
                     () =>
                        `§fill:${
                           saveAtlas.target === 'rename_gamepad' && saveAtlas.navigator()?.selection() === 'quit'
                              ? '#ff0'
                              : '#fff'
                        }§${text.menu.name2}`
                  ),
                  menuText(
                     240,
                     408 - 4,
                     () =>
                        `§fill:${
                           saveAtlas.target === 'rename_gamepad' && saveAtlas.navigator()?.selection() === 'backspace'
                              ? '#ff0'
                              : '#fff'
                        }§${text.menu.name3}`
                  ),
                  menuText(
                     440,
                     408 - 4,
                     () =>
                        `§fill:${
                           saveAtlas.target === 'rename_gamepad' && saveAtlas.navigator()?.selection() === 'done'
                              ? '#ff0'
                              : '#fff'
                        }§${text.menu.name4}`
                  )
               ]
            })
         ]
      })
         .on('from', function () {
            saveAtlas.attach(saveRenderer, 'menu', 'rename_gamepad');
         })
         .on('to', function () {
            saveAtlas.detach(saveRenderer, 'menu', 'rename_gamepad');
         }),
      delete: new CosmosNavigator<string>({
         grid: [ [ 'no', 'yes' ] ],
         flip: true,
         objects: [
            new CosmosText({
               position: { x: 130, y: y + 62.5 },
               anchor: 0,
               fontName: 'CryptOfTomorrow',
               fontSize: 12,
               content: text.general.no
            }).on('tick', function () {
               if (saveAtlas.target === 'delete' && saveAtlas.navigator()?.selection() === 'no') {
                  this.fill = highlightColor;
               } else {
                  this.fill = baseColor;
               }
            }),
            new CosmosText({
               position: { x: 190, y: y + 62.5 },
               anchor: 0,
               fontName: 'CryptOfTomorrow',
               fontSize: 12,
               content: text.general.yes
            }).on('tick', function () {
               if (saveAtlas.target === 'delete' && saveAtlas.navigator()?.selection() === 'yes') {
                  this.fill = highlightColor;
               } else {
                  this.fill = baseColor;
               }
            })
         ],
         next (self) {
            if (self.selection() === 'yes') {
               timelines.delete();
               return 'timelines';
            } else {
               return 'timeline';
            }
         },
         prev: 'timeline'
      })
         .on('change', function () {
            audios.menu.instance(saveRenderer);
         })
         .on('from', function () {
            select();
            this.position = { x: 0, y: 0 };
            saveAtlas.attach(saveRenderer, 'main', 'delete');
         })
         .on('to', function () {
            saveAtlas.detach(saveRenderer, 'main', 'delete');
         })
   });
   function select () {
      audios.select.instance(saveRenderer);
      room.metadata.fx = saveRenderer.time;
   }
   function keyListener (this: CosmosKeyboardInput) {
      switch (this) {
         case keys.downKey:
            if (keys.altKey.active() || keys.menuKey.active()) {
               return;
            }
            saveAtlas.seek('down');
            break;
         case keys.leftKey:
            if (keys.altKey.active() || keys.menuKey.active()) {
               return;
            }
            saveAtlas.seek('left');
            break;
         case keys.rightKey:
            if (keys.altKey.active() || keys.menuKey.active()) {
               return;
            }
            saveAtlas.seek('right');
            break;
         case keys.upKey:
            if (keys.altKey.active() || keys.menuKey.active()) {
               return;
            }
            saveAtlas.seek('up');
            break;
         case keys.interactKey:
            saveAtlas.target === 'rename' || saveAtlas.next();
            break;
         case keys.specialKey:
            saveAtlas.target === 'rename' || saveAtlas.prev();
            break;
      }
   }
   function keydownListener (event: KeyboardEvent) {
      if (saveAtlas.target === 'rename') {
         if (namerange.includes(event.key)) {
            timelines.name.length < 21 && (timelines.name += event.key);
         } else {
            switch (event.key) {
               case 'Backspace':
                  timelines.name.length > 0 && (timelines.name = timelines.name.slice(0, -1));
                  break;
               case 'Enter':
                  saveAtlas.next();
                  break;
               case 'Escape':
                  saveAtlas.prev();
                  break;
            }
         }
      }
   }
   saveRenderer.on('tick', function () {
      filters.crt.time += 0.5;
   });
   filters.crt.time = 0;
   await Promise.all([ mobileLoader, saveSelectorAssets.load() ]);
   saveRenderer.start();
   saveRenderer.attach(
      'below',
      new CosmosSprite({ frames: [ content.ieSplashBackground ], priority: -2, scale: 0.5 }),
      new CosmosRectangle({
         size: { x: 320, y: 240 },
         border: 20,
         stroke: '#000000'
      }),
      room
   );
   if (isMobile.any) {
      saveRenderer.attach('menu', mobile.gamepad());
      mobile.target = saveRenderer.canvas;
   }
   saveAtlas.switch('main');
   saveAtlas.attach(saveRenderer, 'main', 'main');
   saveRenderer.alpha.modulate(saveRenderer, 200, 1);
   const mus = audios.redacted.instance(saveRenderer);
   mus.gain.value /= 10;
   mus.gain.modulate(saveRenderer, 200, mus.gain.value * 10);
   for (const key of Object.values(keys)) {
      key.on('down', keyListener);
   }
   escText.metadata.renderer = saveRenderer;
   const result = (await next.on('from'))[0];
   for (const key of Object.values(keys)) {
      key.off('down', keyListener);
   }
   mus.stop();
   saveRenderer.stop();
   saveRenderer.canvas.remove();
   reverb.disconnect(context);
   if (hashes.of(timelines.name.toLowerCase()) === 670987361852517) {
      SAVE.transfer(sessionStorage);
      SAVE.namespace = '';
      SAVE.state = { s: { room: '_' } };
      SAVE.save();
      game.menu = false;
   } else {
      saveSelectorAssets.unload();
      if (result === 'timeline') {
         SAVE.namespace = timelines.namespace();
      }
   }
   param('namespace', SAVE.namespace);
   escText.metadata.renderer = renderer;
}

/** quick screen-shake */
export async function shake (value = 2, runoff = 500, hold = 0, ...points: number[]) {
   await renderer.shake.modulate(renderer, 0, value);
   await renderer.pause(hold);
   await renderer.shake.modulate(renderer, runoff, ...points, 0);
}

/** trivia provider */
export async function trivia (...lines: string[]) {
   game.movement = false;
   atlas.switch(autoNav());
   await dialogue_primitive(...lines);
   atlas.switch(null);
   game.movement = true;
}

/** quick talker filter */
export function talkFinder (index = 0) {
   return (top: CosmosObject) =>
      top.objects.filter(object => object instanceof CosmosAnimation)[index] as CosmosAnimation;
}

/** room teleporter */
export async function teleport (
   dest: string,
   face: CosmosDirection,
   x: number,
   y: number,
   {
      fade = true,
      fast = false,
      gain = 1 as CosmosProvider<number, [string]>,
      rate = 1 as CosmosProvider<number, [string]>,
      cutscene = false as CosmosProvider<boolean, [string]>
   }
) {
   // clear pagers
   for (const instance of pager.storage.splice(0, pager.storage.length)) {
      instance.active = false;
      instance.page = 0;
   }

   // fire preteleport event
   events.fire('teleport-start', game.room, dest);

   // store movement state
   if (teleporter.forcemove) {
      teleporter.forcemove = false;
      teleporter.movement = true;
   } else {
      teleporter.movement = game.movement;
   }
   teleporter.timer = game.timer;

   // disable movement
   game.movement = false;

   // fire actual preteleport event
   await Promise.all(events.fire('teleport-pre', game.room, dest));

   // get next room
   const next = rooms.of(dest);

   // get room music options
   const score = next.score;

   // get previous room
   const prev = rooms.of(game.room);

   // set music options
   if (!fast) {
      const time = renderer.alpha.value * 300;
      if (!CosmosUtils.provide(cutscene, dest)) {
         // check if old and new music is the same
         if (score.music === prev.score.music) {
            // transition values
            musicFilter.modulate(renderer, fade ? time + 300 : 0, score.filter);
            if (score.rate === prev.score.rate) {
               game.music?.gain.modulate(renderer, fade ? time + 300 : 0, CosmosUtils.provide(gain, dest));
               game.music?.rate.modulate(renderer, fade ? time : 0, score.rate * CosmosUtils.provide(rate, dest));
            } else {
               game.music?.gain.modulate(renderer, fade ? time + 300 : 0, 0);
            }
            musicConvolver.modulate(renderer, fade ? time + 300 : 0, score.reverb);
         } else {
            // fade out old music
            game.music?.gain.modulate(renderer, fade ? time : 0, 0);
         }
      }

      // begin & wait for fade out
      await renderer.alpha.modulate(renderer, fade ? time : 0, 0);
   }

   // pause timer during room load
   game.timer = false;

   // remove old objects
   for (const key in prev.layers) {
      renderer.detach(key as keyof typeof prev.layers, ...(prev.layers[key as keyof typeof prev.layers] ?? []));
   }

   // load all needed assets
   await next.preload.load();

   // add new objects
   if (teleporter.attach) {
      for (const key in next.layers) {
         renderer.attach(key as keyof typeof next.layers, ...(next.layers[key as keyof typeof next.layers] ?? []));
      }
   } else {
      teleporter.attach = true;
   }

   // load new preloads
   for (const neighbor of next.neighbors.map(neighbor => rooms.of(neighbor))) {
      neighbor.preload.load();
   }

   // store previous key for event
   const prevkey = game.room;

   // set room
   game.room = dest;
   events.fire('teleport-update', face, { x, y });

   // wait for listeners to update
   await renderer.on('render');

   // unload old preloads (not including assets in new preload set)
   const safezone = [ next, ...next.neighbors.map(neighbor => rooms.of(neighbor)) ];
   for (const neighbor of [ prev, ...prev.neighbors.map(neighbor => rooms.of(neighbor)) ]) {
      safezone.includes(neighbor) || neighbor.preload.unload();
   }

   // fire teleport event
   events.fire('teleport', prevkey, dest);

   // update camera bounds
   if (teleporter.region !== null) {
      renderer.region = teleporter.region;
      teleporter.region = null;
   } else {
      renderer.region[0].x = next.region[0]?.x ?? renderer.region[0].x;
      renderer.region[0].y = next.region[0]?.y ?? renderer.region[0].y;
      renderer.region[1].x = next.region[1]?.x ?? renderer.region[1].x;
      renderer.region[1].y = next.region[1]?.y ?? renderer.region[1].y;
   }

   // resume timer
   game.timer = teleporter.timer;
   game.movement = teleporter.movement;

   if (!fast) {
      // begin fade in
      renderer.alpha.modulate(renderer, fade ? 300 : 0, 1);

      // start new music if applicable
      if (teleporter.nomusic) {
         teleporter.nomusic = false;
      } else if (
         !CosmosUtils.provide(cutscene, dest) &&
         (score.music !== prev.score.music || (score.music && !game.music))
      ) {
         resume({ gain: CosmosUtils.provide(gain, dest), rate: CosmosUtils.provide(rate, dest) });
      } else if (score.rate !== prev.score.rate) {
         game.music && (game.music.rate.value = score.rate * CosmosUtils.provide(rate, dest));
         game.music?.gain.modulate(renderer, fade ? 300 : 0, CosmosUtils.provide(gain, dest));
      }
   }

   // room tick
   events.fire('tick');
}

export function temporary<X extends CosmosObject> (
   object: X,
   parent: OutertaleLayerKey | CosmosObject,
   callback = () => {}
) {
   typeof parent === 'string' ? renderer.attach(parent, object) : parent.attach(object);
   events.on('teleport').then(() => {
      typeof parent === 'string'
         ? renderer.detach(parent, object)
         : parent.objects.splice(parent.objects.indexOf(object), 1);
      callback();
   });
   return object;
}

export function ultimaFacer (
   { position, size }: { position: CosmosPointSimple; size: { x: number } },
   away = false
): CosmosDirection {
   if (Math.abs(position.x - player.position.x) < Math.abs(size.x) / 2 + 5) {
      return player.position.y < position.y === away ? 'down' : 'up';
   } else {
      return player.position.x < position.x === away ? 'right' : 'left';
   }
}

export function ultraPosition (room: string) {
   const roomValue = rooms.of(room);
   let face: CosmosDirection = 'down';
   let position = roomValue.decorator?.spawn;
   if (!position) {
      const spawn = Object.values((roomValue.decorator ?? {}).layers ?? {})
         .flat(1)
         .find(x => x?.tags?.includes('spawn'));
      if (spawn) {
         position = { x: spawn.position?.x ?? 0, y: (spawn.position?.y ?? 0) + 7 };
      } else {
         const script = roomValue.neighbors
            .map(neighbor => rooms.of(neighbor))
            .map(x => x.decorator ?? {})
            .map(x => Object.values(x.layers ?? {}))
            .flat(2)
            .map(x => x?.triggers ?? [])
            .flat(1)
            .find(x => x.name === 'teleport' && x.args!.includes(room));
         if (script) {
            face = script.args![1] as CosmosDirection;
            position = { x: +script.args![2], y: +script.args![3] };
         } else {
            position = {
               x: ((roomValue.region?.[0]?.x ?? 0) + (roomValue.region?.[1]?.x ?? 0)) / 2,
               y: ((roomValue.region?.[0]?.y ?? 0) + (roomValue.region?.[1]?.y ?? 0)) / 2
            };
         }
      }
   }
   return { face, position };
}

export function updateArmor (armor: string) {
   SAVE.data.s.armor = armor;
   items.of('spacesuit').value = armor === 'spacesuit' ? 0 : 20;
}

/** item handling */
export async function use (key: string, index: number) {
   await Promise.all(events.fire('pre-consume', key, index));
   const item = items.of(key);
   if (item.type === 'consumable') {
      item.useSFX && (item.useSFX === true ? sounds.swallow : item.useSFX).instance(renderer);
      SAVE.storage.inventory.remove(index);
      typer.variables.x = Math.abs(item.value).toString();
   } else {
      item.useSFX && (item.useSFX === true ? sounds.equip : item.useSFX).instance(renderer);
      if (item.type === 'armor') {
         SAVE.storage.inventory.set(index, SAVE.data.s.armor || 'spacesuit');
         updateArmor(key);
      } else if (item.type === 'weapon') {
         SAVE.storage.inventory.set(index, SAVE.data.s.weapon || 'spanner');
         SAVE.data.s.weapon = key;
      }
   }
   await Promise.all(events.fire('consume', key, index));
   const lines = CosmosUtils.provide(item.text.use).slice();
   if (item.type === 'consumable') {
      0 <= item.value && renderer.pause(300).then(() => heal(item.value, item.healSFX));
      if (lines.length > 0) {
         if (item.value <= -SAVE.data.n.hp) {
            lines[0] += `\n${text.menu.heal4}`;
         } else if (item.value < 0) {
            lines[0] += `\n${text.menu.heal3}`;
         } else if (item.value < calcHP() - SAVE.data.n.hp) {
            lines[0] += `\n${text.menu.heal2}`;
         } else {
            lines[0] += `\n${text.menu.heal1}`;
         }
      }
   }
   await dialogue_primitive(...lines);
   await Promise.all(events.fire('use', key, index));
   item.type === 'consumable' && item.value < 0 && heal(item.value, item.healSFX);
   await Promise.all(events.fire('post-use', key, index));
}

export async function waterpour () {
   player.alpha.value = 0;
   const spiller = new CosmosAnimation({
      active: true,
      anchor: { x: 0, y: 1 },
      position: player.position,
      resources: content.iocFriskLeftWaterPour
   });
   renderer.attach('main', spiller);
   await renderer.when(() => spiller.index === 8);
   spiller.disable();
   SAVE.data.b.water = false;
   await renderer.pause(650);
   renderer.detach('main', spiller);
   player.alpha.value = 1;
}

atlas.navigators.register({
   battlerSimple: new CosmosNavigator({
      next: () => void typer.read(),
      prev: () => void typer.skip(),
      objects: [
         new CosmosRectangle({ fill: '#000', size: { x: 340, y: 260 }, anchor: 0, position: { x: 160, y: 120 } }),
         new CosmosObject({
            objects: [
               new CosmosText({
                  position: { x: 200 / 2, y: 403 / 2 - 0.5 },
                  fill: '#fff',
                  stroke: '',
                  fontName: 'MarsNeedsCunnilingus',
                  fontSize: 12
               }).on('tick', function () {
                  this.content = `${text.general.lv} ${calcLV()}`;
               }),
               new CosmosObject({
                  fill: '#fff',
                  stroke: '',
                  position: { x: 274 / 2, y: 400 / 2 },
                  objects: [
                     new CosmosSprite({ frames: [ content.ibuHP ], position: { y: 2.5 }, scale: 0.5 }),
                     new CosmosRectangle({ fill: '#ff0', position: { x: 18 }, size: { y: 10.5 } }),
                     new CosmosRectangle({ fill: '#f00', size: { y: 10.5 } }),
                     new CosmosText({ position: { y: 1 }, fontName: 'MarsNeedsCunnilingus', fontSize: 12 })
                  ]
               }).on('tick', function () {
                  const cur = SAVE.data.n.hp;
                  const max = calcHP();
                  const hp = cur === Infinity ? max : cur;
                  (this.objects[1] as CosmosRectangle).size.x = hp * 0.6 + 0.5;
                  const ob2 = this.objects[2] as CosmosRectangle;
                  ob2.position.x = 18.5 + hp * 0.6;
                  ob2.size.x = Math.max(0, max - hp) * 0.6;
                  const ob3 = this.objects[3] as CosmosText;
                  ob3.content = `${cur === Infinity ? text.general.inf : cur.toString().padStart(2, '0')} / ${max}`;
                  ob3.position.x = Math.max(max, hp) * 0.6 + 28;
               })
            ]
         }).on('tick', function () {
            this.alpha.value = battler.alpha.value;
         }),
         battler.box
      ]
   })
      .on('from', from => {
         [ 'battlerAdvancedText', 'dialoguerBase' ].includes(from!) || atlas.attach(renderer, 'menu', 'battlerSimple');
      })
      .on('to', to => {
         [ 'battlerAdvancedText', 'dialoguerBase' ].includes(to!) || atlas.detach(renderer, 'menu', 'battlerSimple');
      }),
   battlerAdvanced: new CosmosNavigator({
      next (self) {
         sounds.select.instance(renderer);
         switch (self.selection()) {
            case 'item':
               return SAVE.storage.inventory.size > 0 ? 'battlerAdvancedItem' : void 0;
            case 'mercy':
               return 'battlerAdvancedMercy';
            default:
               const bat = atlas.navigators.of('battlerAdvancedTarget');
               bat.position.x = 0;
               bat.position.y = 0;
               return 'battlerAdvancedTarget';
         }
      },
      prev: () => void typer.skip(),
      flip: true,
      grid: () => [
         battler.buttons.filter(button => button.alpha.value === 1).map(button => button.metadata.button as string)
      ],
      objects: [
         new CosmosRectangle({ fill: '#000', size: { x: 340, y: 260 }, anchor: 0, position: { x: 160, y: 120 } }),
         battler.gridder,
         battler.overlay,
         new CosmosObject({
            objects: [
               new CosmosObject({
                  fill: '#fff',
                  stroke: '',
                  position: { x: 30 / 2, y: 403 / 2 },
                  objects: [
                     new CosmosText({
                        position: { y: -0.5 },
                        fontName: 'MarsNeedsCunnilingus',
                        fontSize: 12
                     }).on('tick', function () {
                        this.content = SAVE.data.s.name || text.general.mystery1;
                     }),
                     new CosmosText({
                        position: { x: 117, y: -0.5 },
                        fontName: 'MarsNeedsCunnilingus',
                        fontSize: 12
                     }).on('tick', function () {
                        this.position.x = 13.5 + (SAVE.data.s.name.length || 6) * 7.5;
                        this.content = world.archive
                           ? `${text.general.xm} ${SAVE.data.n.xm + 1}`
                           : `${text.general.lv} ${calcLV()}`;
                     })
                  ]
               }),
               new CosmosObject({
                  position: { x: 244 / 2, y: 400 / 2 },
                  fill: '#fff',
                  stroke: '',
                  metadata: { sparkleshadow: false },
                  objects: [
                     new CosmosSprite({ frames: [ content.ibuHP ], position: { y: 2.5 }, scale: 0.5 }),
                     new CosmosRectangle({ fill: '#ff0', position: { x: 15.5 }, size: { y: 10.5 } }),
                     new CosmosRectangle({ fill: '#0f0', position: { x: 15.5 }, size: { y: 10.5 } }),
                     new CosmosRectangle({ fill: '#f00', size: { y: 10.5 } }),
                     new CosmosText({ position: { y: 1 }, fontName: 'MarsNeedsCunnilingus', fontSize: 12 }),
                     new CosmosObject()
                  ]
               }).on('tick', function () {
                  const cur = SAVE.data.n.hp;
                  const max = world.archive ? cur : calcHP();
                  let iv = 0;
                  if (atlas.target === 'battlerAdvancedItem' && cur !== Infinity) {
                     const item = items.of(
                        SAVE.storage.inventory.of(atlas.navigators.of('battlerAdvancedItem').position.y)!
                     );
                     item.type === 'consumable' && (iv = item.value);
                  }
                  const hp = cur === Infinity ? max : cur;
                  const hx = hp + Math.min(Math.max(iv, -hp), 0);
                  const hl = hp < max ? Math.min(Math.max(iv, 0), max - hp) : 0;
                  (this.objects[1] as CosmosRectangle).size.x = hx * 0.6 + 0.5;
                  const ob2 = this.objects[2] as CosmosRectangle;
                  ob2.position.x = 16 + hx * 0.6;
                  ob2.size.x = hl * 0.6;
                  const ob3 = this.objects[3] as CosmosRectangle;
                  ob3.position.x = 16 + (hx + hl) * 0.6;
                  ob3.size.x = Math.max(max - (hx + hl), 0) * 0.6;
                  const ob4 = this.objects[4] as CosmosText;
                  ob4.content = `${
                     battler.fakehp ?? (cur === Infinity ? text.general.inf : cur.toString().padStart(2, '0'))
                  }${world.archive ? '' : ` / ${max}`}`;
                  ob4.position.x = Math.max(max, hp) * 0.6 + 23;
                  if (this.metadata.sparkleshadow) {
                     this.metadata.sparkleshadow = false;
                     const ob5 = this.objects[5];
                     const rec = new CosmosRectangle({
                        fill: '#ff0',
                        size: { x: hx * 0.6 + 0.5, y: 10.5 },
                        anchor: 0,
                        position: { x: 15.75 + hx * 0.3, y: 5.25 }
                     });
                     ob5.attach(rec);
                     rec.scale.modulate(renderer, 1000, 2);
                     rec.alpha.modulate(renderer, 1000, 0).then(() => ob5.detach(rec));
                  }
               }),
               ...battler.buttons
            ]
         }).on('tick', function () {
            this.alpha.value = battler.alpha.value;
         }),
         battler.box
      ]
   })
      .on('from', () => {
         dialogue_primitive(...battler.status);
         battler.refocus();
      })
      .on('to', () => {
         typer.reset(true);
         game.text = '';
      })
      .on('change', () => {
         battler.refocus();
      }),
   battlerAdvancedTarget: new CosmosNavigator<string>({
      grid () {
         const grid = [] as number[][];
         const list = battler.indexes;
         if (list.length > 0) {
            grid.push(list.slice(0, 3));
            if (list.length > 3) {
               grid.push(list.slice(3, 6));
            }
         }
         return grid;
      },
      next () {
         if (atlas.navigators.of('battlerAdvanced').selection() === 'item') {
            return null;
         } else if (atlas.navigators.of('battlerAdvanced').selection() === 'act') {
            return 'battlerAdvancedAct';
         } else {
            events.fire('select', 'fight');
            battler.fight();
            return null;
         }
      },
      prev () {
         if (atlas.navigators.of('battlerAdvanced').selection() === 'item') {
            return 'battlerAdvancedItem';
         } else {
            return 'battlerAdvanced';
         }
      },
      objects: [
         new CosmosObject({
            fontName: 'DeterminationMono',
            fontSize: 16,
            objects: [
               ...CosmosUtils.populate(3, index =>
                  menuText(
                     100 + Math.floor(index / 3) * 256,
                     278 + Math.floor(index % 3) * 32 - 4,
                     () =>
                        battler.alive.length > index ? CosmosUtils.provide(battler.alive[index].opponent.name) : '',
                     {
                        objects: [
                           new CosmosSprite({
                              scale: 1 / 2,
                              frames: [ content.ibuCharm ]
                           }).on('tick', function () {
                              if (battler.alive.length > index) {
                                 const volatile = battler.alive[index];
                                 if (volatile.opponent.flirted()) {
                                    this.alpha.value = 1;
                                    this.position.x = 8 * CosmosUtils.provide(volatile.opponent.name).length + 2;
                                    return;
                                 }
                              }
                              this.alpha.value = 0;
                           }),
                           new CosmosSprite({
                              scale: 1 / 2,
                              frames: [ content.ibuHarm ]
                           }).on('tick', function () {
                              if (battler.alive.length > index) {
                                 const volatile = battler.alive[index];
                                 if (volatile.opponent.bullied()) {
                                    this.alpha.value = 1;
                                    this.position.x =
                                       8 * CosmosUtils.provide(volatile.opponent.name).length +
                                       (volatile.opponent.flirted() ? 12 : 2);
                                    return;
                                 }
                              }
                              this.alpha.value = 0;
                           }),
                           new CosmosRectangle({
                              position: { x: 77, y: 3 },
                              fill: '#f00',
                              stroke: '',
                              size: { x: 101 / 2, y: 17 / 2 },
                              objects: [
                                 new CosmosRectangle({ fill: '#0f0', size: { y: 17 / 2 } }).on('tick', function () {
                                    if (
                                       atlas.navigators.of('battlerAdvanced').selection() !== 'act' &&
                                       battler.alive.length > index
                                    ) {
                                       const volatile = battler.alive[index];
                                       const ratio = volatile.hp === Infinity ? 1 : volatile.hp / volatile.opponent.hp;
                                       this.size.x = Math.ceil(50.5 * ratio);
                                    }
                                 })
                              ]
                           }).on('tick', function () {
                              if (
                                 atlas.navigators.of('battlerAdvanced').selection() !== 'act' &&
                                 battler.alive.length > index
                              ) {
                                 this.alpha.value = 1;
                                 this.position.x = Math.min(
                                    45 +
                                       8 *
                                          Math.max(
                                             ...battler.alive.map(
                                                volatile => CosmosUtils.provide(volatile.opponent.name).length
                                             )
                                          ),
                                    186
                                 );
                              } else {
                                 this.alpha.value = 0;
                              }
                           })
                        ]
                     }
                  ).on('tick', function () {
                     this.fill = battler.alive[index]?.sparable
                        ? '#ffff00'
                        : battler.alive[index]?.opponent.metadata.blueCondition?.() ||
                          battler.bullied.includes(battler.alive[index])
                        ? '#3f00ff'
                        : '#ffffff';
                     this.stroke =
                        battler.alive[index]?.opponent.metadata.pinkCondition?.() || battler.alive[index]?.flirted
                           ? '#cf7fff'
                           : '';
                  })
               ),
               ...CosmosUtils.populate(
                  6,
                  index =>
                     new CosmosRectangle({
                        position: { x: 32 + index * 130 + 99 }
                     })
               )
            ]
         })
      ]
   })
      .on('to', function (to) {
         if (to === null || to === 'battlerAdvancedAct') {
            atlas.navigators.of('battlerAdvanced').selection() === 'item' || sounds.select.instance(renderer);
         }
      })
      .on('from', function (from) {
         if (from === 'battlerAdvanced' || from === 'battlerAdvancedItem') {
            this.position.x = 0;
            this.position.y = 0;
         }
      }),
   battlerAdvancedAct: new CosmosNavigator({
      flip: true,
      grid () {
         const acts = CosmosUtils.provide(battler.target!.opponent.acts).map(value => value[0]);
         switch (acts.length) {
            case 0:
               return [];
            case 1:
               return [ [ acts[0] ] ];
            case 2:
               return [ [ acts[0], acts[1] ] ];
            case 3:
               return [ [ acts[0], acts[1] ], [ acts[2] ] ];
            case 4:
               return [
                  [ acts[0], acts[1] ],
                  [ acts[2], acts[3] ]
               ];
            case 5:
               return [ [ acts[0], acts[1] ], [ acts[2], acts[3] ], [ acts[4] ] ];
            default:
               return [
                  [ acts[0], acts[1] ],
                  [ acts[2], acts[3] ],
                  [ acts[4], acts[5] ]
               ];
         }
      },
      next (self) {
         const act = self.selection();
         const volatile = battler.target!;
         for (const [ key, text, colortext, override ] of CosmosUtils.provide(volatile.opponent.acts)) {
            if (act === key) {
               if (!override) {
                  battler.SOUL.alpha.value = 0;
                  battler.refocus();
                  events.fire('select', 'act', act);
                  atlas.switch('battlerAdvancedText');
                  dialogue_primitive(...CosmosUtils.provide(text, volatile)).then(() => {
                     atlas.switch(null);
                     events.fire('choice', { type: 'act', act });
                  });
               }
               break;
            }
         }
      },
      prev: 'battlerAdvancedTarget',
      objects: [
         new CosmosObject({
            fontName: 'DeterminationMono',
            fontSize: 16,
            objects: CosmosUtils.populate(6, index =>
               menuText(100 + Math.floor(index % 2) * 256, 278 + Math.floor(index / 2) * 32 - 4, () => {
                  const acts = CosmosUtils.provide(battler.target!.opponent.acts);
                  if (acts.length > index) {
                     const act = acts[index];
                     const colortext = CosmosUtils.provide(act[2], battler.target!);
                     return `${colortext ? `§fill:${colortext}§` : ''}${battler.acts.of(act[0])}`;
                  } else {
                     return '';
                  }
               })
            )
         })
      ]
   }),
   battlerAdvancedItem: new CosmosNavigator({
      flip: true,
      grid: () => [ [ ...CosmosUtils.populate(SAVE.storage.inventory.size, index => index) ] ],
      next (self) {
         battler.noItemChoice = false;
         const index = self.selection() as number;
         const item = SAVE.storage.inventory.of(index)!;
         battler.SOUL.alpha.value = 0;
         battler.refocus();
         events.fire('select', 'item', item);
         atlas.switch('battlerAdvancedText');
         use(item, index).then(() => {
            if (!battler.noItemChoice) {
               atlas.switch(null);
               events.fire('choice', { type: 'item', item });
            }
         });
      },
      objects: [
         new CosmosObject({
            fontName: 'DeterminationMono',
            fontSize: 16,
            objects: [
               ...CosmosUtils.populate(2, index =>
                  menuText(100 + Math.floor(index % 2) * 256, 278 - 4, () => {
                     const key = SAVE.storage.inventory.of(
                        Math.floor(atlas.navigators.of('battlerAdvancedItem').position.y / 2) * 2 + index
                     );
                     if (key) {
                        return `* ${items.of(key).text.battle.name}`;
                     } else {
                        return '';
                     }
                  })
               ),
               menuText(
                  76,
                  310 - 4,
                  () => {
                     const key = SAVE.storage.inventory.of(atlas.navigators.of('battlerAdvancedItem').position.y);
                     if (key) {
                        return CosmosTextUtils.format(
                           CosmosUtils.provide(items.of(key).text.battle.description),
                           32,
                           true
                        );
                     } else {
                        return '';
                     }
                  },
                  { spacing: { y: 2 }, fill: '#808080' }
               )
            ]
         }),
         new CosmosObject({ position: { y: 187 }, fill: '#fff' }).on('tick', function () {
            const len = SAVE.storage.inventory.size;
            if (this.metadata.len !== len) {
               this.metadata.len = len;
               const dots = Math.ceil(len / 2);
               if (dots < 2) {
                  this.objects = [];
               } else {
                  const dotSize = 10;
                  const totalWidth = dots * dotSize;
                  const origin = 160 - totalWidth / 2 + dotSize / 2;
                  this.objects = CosmosUtils.populate(dots, index =>
                     new CosmosRectangle({
                        anchor: 0,
                        position: { x: origin + index * dotSize },
                        size: 4
                     }).on('tick', function () {
                        if (index === Math.floor(atlas.navigators.of('battlerAdvancedItem').selection() / 2)) {
                           this.alpha.value = 1;
                        } else {
                           this.alpha.value = 0.5;
                        }
                     })
                  );
               }
            }
         })
      ],
      prev: 'battlerAdvanced'
   }),
   battlerAdvancedMercy: new CosmosNavigator({
      grid () {
         const mercyoverride = CosmosUtils.provide(battler.target?.opponent.mercyoverride ?? null);
         if (mercyoverride === null) {
            return [
               [ 'spare', ...(battler.flee ? [ 'flee' ] : []), ...(battler.assist && !SAVE.data.b.oops ? [ 'assist' ] : []) ]
            ];
         } else {
            const acts = mercyoverride.map(value => value[0]);
            switch (acts.length) {
               case 0:
                  return [];
               case 1:
                  return [ [ acts[0] ] ];
               case 2:
                  return [ [ acts[0] ], [ acts[1] ] ];
               case 3:
                  return [ [ acts[0], acts[2] ], [ acts[1] ] ];
               case 4:
                  return [
                     [ acts[0], acts[2] ],
                     [ acts[1], acts[3] ]
                  ];
               case 5:
                  return [
                     [ acts[0], acts[2], acts[4] ],
                     [ acts[1], acts[3] ]
                  ];
               default:
                  return [
                     [ acts[0], acts[2], acts[4] ],
                     [ acts[1], acts[3], acts[5] ]
                  ];
            }
         }
      },
      next (self) {
         const mercyoverride = CosmosUtils.provide(battler.target?.opponent.mercyoverride ?? null);
         if (mercyoverride === null) {
            battler.SOUL.alpha.value = 0;
            battler.refocus();
            atlas.switch(null);
            atlas.detach(renderer, 'menu', 'battlerAdvancedText');
            const selection = self.selection() as 'spare' | 'flee' | 'assist';
            events.fire('select', selection);
            events.fire('choice', { type: selection });
         } else {
            const act = self.selection();
            const volatile = battler.target!;
            for (const [ key, text, colortext, disable ] of mercyoverride) {
               if (act === key) {
                  if (!disable) {
                     battler.SOUL.alpha.value = 0;
                     battler.refocus();
                     events.fire('select', 'act', act);
                     atlas.switch('battlerAdvancedText');
                     dialogue_primitive(...CosmosUtils.provide(text, volatile)).then(() => {
                        atlas.switch(null);
                        events.fire('choice', { type: 'act', act });
                     });
                  }
                  break;
               }
            }
         }
      },
      prev: 'battlerAdvanced',
      objects: [
         new CosmosObject({
            fontName: 'DeterminationMono',
            fontSize: 16,
            objects: CosmosUtils.populate(6, index =>
               menuText(100 + Math.floor(index % 2) * 256, 278 + Math.floor(index / 2) * 32 - 4, () => {
                  const acts = CosmosUtils.provide(battler.target?.opponent.mercyoverride ?? null);
                  if (acts !== null && acts.length > index) {
                     const act = acts[index];
                     const colortext = CosmosUtils.provide(act[2], battler.target!);
                     return `${colortext ? `§fill:${colortext}§` : ''}${battler.acts.of(act[0])}`;
                  } else {
                     return '';
                  }
               })
            )
         }).on('tick', function () {
            this.alpha.value = CosmosUtils.provide(battler.target?.opponent.mercyoverride ?? null) === null ? 0 : 1;
         }),
         new CosmosObject({
            fontName: 'DeterminationMono',
            fontSize: 16,
            objects: ([ 'spare', 'flee', 'assist' ] as ['spare', 'flee', 'assist']).map((key, index) =>
               menuText(100, 278 + Math.floor(index) * 32 - 4, () => {
                  return CosmosUtils.provide(atlas.navigators.of('battlerAdvancedMercy').grid)[0].length > index
                     ? text.battle[`mercy_${index < 1 || battler.flee ? key : 'assist'}`]
                     : '';
               }).on('tick', function () {
                  if (CosmosUtils.provide(atlas.navigators.of('battlerAdvancedMercy').grid)[0].length > index) {
                     switch (index < 1 || battler.flee ? key : 'assist') {
                        case 'spare':
                           if (battler.alive.filter(volatile => volatile.sparable).length > 0) {
                              this.fill = '#ffff00';
                           } else if (battler.bullied.length > 0) {
                              this.fill = '#3f00ff';
                           } else {
                              this.fill = '#ffffff';
                           }
                           break;
                        case 'assist':
                           this.fill = '#ffff00';
                           break;
                     }
                  } else {
                     this.fill = '#ffffff';
                  }
               })
            )
         }).on('tick', function () {
            this.alpha.value = CosmosUtils.provide(battler.target?.opponent.mercyoverride ?? null) === null ? 1 : 0;
         })
      ]
   }),
   battlerAdvancedText: new CosmosNavigator({
      next: () => void typer.read(),
      prev: () => void typer.skip(),
      objects: [
         menuText(0, 278 - 4, () => game.text, {
            fontName: 'DeterminationMono',
            fontSize: 16,
            spacing: { y: 2 },
            priority: 1
         }).on('tick', function () {
            this.position.x = speech.state.face ? 84 : 26;
         }),
         new CosmosObject({ position: { x: 50.5, y: 160 }, priority: 1 })
      ]
   }).on('to', () => {
      atlas.detach(renderer, 'menu', 'battlerAdvancedText');
   }),
   choicer: new CosmosNavigator({
      flip: true,
      grid: () => CosmosUtils.populate(choicer.type + 1, index => [ index * 2, index * 2 + 1 ]),
      next: self => {
         choicer.result = self.selection() as number;
         choicer.navigator === void 0 || atlas.switch(choicer.navigator);
         atlas.detach(renderer, 'menu', 'choicer');
         typer.read();
      },
      objects: CosmosUtils.populate(6, index => {
         return menuSOUL(0, 0, 'choicer', index).on('tick', function () {
            const row = Math.floor(index / 2) + (2 - choicer.type);
            if (row < 3) {
               this.position.set(
                  19 +
                     (index % 2 === 0 ? choicer.marginA : choicer.marginB + 16) * 8 -
                     (choicer.navigator === 'battlerAdvancedText' ? 4 : 0),
                  choicer.navigator === 'battlerAdvancedText'
                     ? 139 + row * 16
                     : (choicer.navigator === 'dialoguerTop' ? 19 : 174) + row * 19
               );
            }
         });
      })
   }).on('from', function () {
      this.position = { x: 0, y: 0 };
   }),
   dialoguerBase: new CosmosNavigator({
      next () {
         typer.read();
         for (const typer_local of battler.multitext.typers) {
            typer_local.read();
         }
      },
      prev () {
         typer.skip();
         for (const typer_local of battler.multitext.typers) {
            typer_local.skip();
         }
      }
   }),
   dialoguerBottom: new CosmosNavigator({
      next: () => void typer.read(),
      prev: () => void typer.skip(),
      objects: [
         menuBox(32, 320, 566, 140, 6, { objects: dialogueObjects() }).on('tick', function () {
            this.fontName = speech.state.fontName1;
            this.fontSize = speech.state.fontSize1;
         })
      ]
   }),
   dialoguerTop: new CosmosNavigator({
      next: () => void typer.read(),
      prev: () => void typer.skip(),
      objects: [
         menuBox(32, 10, 566, 140, 6, { objects: dialogueObjects() }).on('tick', function () {
            this.fontName = speech.state.fontName1;
            this.fontSize = speech.state.fontSize1;
         })
      ]
   }),
   frontEnd: new CosmosNavigator<string>({
      next: 'frontEndLanding',
      objects: [
         new CosmosAnimation({
            alpha: 0,
            anchor: { x: 0 },
            position: { x: 160, y: 31 },
            resources: content.ieStory
         }).on('tick', function () {
            this.index = frontEnder.index;
            this.subcrop.top = Math.round(frontEnder.scroll.value * 107);
            this.subcrop.bottom = -(this.subcrop.top + 107);
         }),
         menuText(120, 328 - 4, () => game.text, {
            fontName: 'DeterminationMono',
            fontSize: 16,
            spacing: { x: 1, y: 5 }
         })
      ]
   }).on('from', async function () {
      const panel = this.objects[0] as CosmosAnimation;
      atlas.attach(renderer, 'menu', 'frontEnd');
      frontEnder.introMusic = music.story.instance(renderer);
      while (atlas.target === 'frontEnd') {
         panel.alpha.modulate(renderer, 500, 1);
         const idle = typer.on('idle');
         dialogue_primitive(
            ...[
               text.menu.story1,
               text.menu.story2,
               text.menu.story3,
               text.menu.story4,
               text.menu.story5,
               text.menu.story6,
               text.menu.story7,
               text.menu.story8,
               text.menu.story9,
               text.menu.story10,
               text.menu.story11
            ][frontEnder.index - 1].map(text => `{#p/storyteller}${CosmosTextUtils.format(text, 24, true)}`)
         );
         await idle;
         const last = frontEnder.index === 11;
         if (last) {
            await frontEnder.scroll.modulate(renderer, 4000, 0);
            if (atlas.target !== 'frontEnd') {
               break;
            }
         }
         await renderer.pause(2000);
         if (atlas.target !== 'frontEnd') {
            break;
         }
         await panel.alpha.modulate(renderer, 500, 0);
         if (atlas.target !== 'frontEnd') {
            break;
         }
         if (last) {
            atlas.switch('frontEndLanding');
         } else {
            frontEnder.index++;
         }
      }
   }),
   frontEndLanding: new CosmosNavigator<string>({
      next: () => (SAVE.data.s.name ? 'frontEndLoad' : 'frontEndStart'),
      objects: [
         frontEnder.createBackground(),
         new CosmosSprite({
            frames: [ content.ieSplashForeground ]
         }),
         menuText(240, 360 - 2, () => text.general.landing1, {
            alpha: 0,
            fill: '#808080',
            fontName: 'CryptOfTomorrow',
            fontSize: 8
         })
      ]
   })
      .on('from', async function () {
         game.input = false;
         const text = this.objects[2];
         text.alpha.value = 0;
         typer.reset(true);
         game.text = '';
         await Promise.all([
            frontEnder.introMusic!.gain.modulate(renderer, 1000, 0),
            atlas.navigators.of('frontEnd').objects[0].alpha.modulate(renderer, 1000, 0, 0, 0)
         ]);
         game.input = true;
         frontEnder.introMusic?.stop();
         frontEnder.impactNoise = sounds.impact.instance(renderer);
         atlas.detach(renderer, 'menu', 'frontEnd');
         atlas.attach(renderer, 'menu', 'frontEndLanding');
         await renderer.pause(3e3);
         text.alpha.value = 1;
         await renderer.pause(16e3);
         if (atlas.target === 'frontEndLanding') {
            frontEnder.index = 1;
            frontEnder.scroll.task?.();
            frontEnder.scroll.value = 1;
            atlas.switch('frontEnd');
         } else {
            content.amStory.unload();
            content.ieStory.unload();
         }
      })
      .on('to', () => {
         atlas.detach(renderer, 'menu', 'frontEndLanding');
      }),
   frontEndLoad: new CosmosNavigator({
      flip: true,
      grid: () => [
         [ 'continue', ...(!SAVE.flag.b.true_reset && SAVE.data.n.plot === 72 ? [] : [ 'reset' ]) ],
         [ 'settings', ...(!SAVE.flag.b.true_reset && SAVE.data.n.plot === 72 ? [] : [ 'settings' ]) ]
      ],
      next (self) {
         switch (self.selection()) {
            case 'continue':
               frontEnder.menuMusic?.stop();
               events.fire('spawn');
               break;
            case 'reset':
               if (SAVE.flag.b.true_reset) {
                  frontEnder.trueReset = true;
                  return 'frontEndName';
               } else {
                  return 'frontEndNameConfirm';
               }
            case 'settings':
               return 'frontEndSettings';
         }
      },
      objects: [
         frontEnder.createBackground(),
         new CosmosObject({
            area: renderer.area,
            position: { y: 220 },
            filters: [
               new OutlineFilter(2, 0xffffff, 0.1, 0.1, false),
               new OutlineFilter(1, 0xffffff, 0.1, 0.1, false),
               new AdvancedBloomFilter({ quality: 10, threshold: 0, brightness: 1, bloomScale: 0.1 })
            ],
            objects: [
               new CosmosObject({
                  objects: [
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 22.5 },
                        metadata: { time: renderer.time },
                        resources: content.iocAsrielTrueDown
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.b.svr ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 48 },
                        resources: content.iocTorielDown
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.n.state_wastelands_toriel === 0 && 14 <= SAVE.data.n.plot ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 92 },
                        resources: content.iocAsgoreDownHappy
                     }).on('tick', function () {
                        this.alpha.value = 72 <= SAVE.data.n.plot ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 132 },
                        resources: content.iocKiddDown
                     }).on('tick', function () {
                        this.alpha.value = !SAVE.data.b.f_state_kidd_betray && 47 <= SAVE.data.n.plot ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 160 },
                        active: true,
                        resources: content.iocPapyrusCape
                     }).on('tick', function () {
                        this.alpha.value = 1.1 <= SAVE.data.n.plot_date ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 191 },
                        active: true,
                        resources: content.iocUndyneDateFlex
                     }).on('tick', function () {
                        this.alpha.value = 2.1 <= SAVE.data.n.plot_date ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 219 },
                        resources: content.iocAlphysDown
                     }).on('tick', function () {
                        this.alpha.value = 49 <= SAVE.data.n.plot ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 255 },
                        active: true,
                        resources: content.iocMettatonWave,
                        extrapolate: false,
                        duration: 9
                     }).on('tick', function () {
                        this.alpha.value = 68 <= SAVE.data.n.plot ? 1 : 0;
                        if (SAVE.data.b.a_state_hapstablook) {
                           this.resources === content.iocMettatonWaveHapstablook ||
                              this.use(content.iocMettatonWaveHapstablook);
                        } else {
                           this.resources === content.iocMettatonWave || this.use(content.iocMettatonWave);
                        }
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 292, y: 2 },
                        active: true,
                        resources: content.iocNapstablookBody
                     }).on('tick', function () {
                        this.alpha.value = world.happy_ghost ? 1 : 0;
                     }),
                     new CosmosSprite({
                        anchor: { x: 0, y: 1 },
                        position: { x: 8 },
                        active: true,
                        frames: [ content.iooSippy ]
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.b.water ? 1 : 0;
                     })
                  ]
               }).on('tick', function () {
                  if (
                     SAVE.flag.b.true_reset ||
                     SAVE.data.n.exp > 0 ||
                     (SAVE.data.s.room[0] === 'c' && SAVE.data.s.room.startsWith('c_archive'))
                  ) {
                     this.alpha.value = 0;
                  } else {
                     this.alpha.value = 1;
                  }
               }),
               new CosmosObject({
                  objects: [
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 60 },
                        resources: content.iocHPatienceDown
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.n.state_citadel_archive > 0 ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 100 },
                        resources: content.iocHBraveryDown
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.n.state_citadel_archive > 1 ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 140 },
                        resources: content.iocHIntegrityDown
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.n.state_citadel_archive > 2 ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 180 },
                        resources: content.iocHPerserveranceDown
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.n.state_citadel_archive > 3 ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 220 },
                        resources: content.iocHKindnessDown
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.n.state_citadel_archive > 4 ? 1 : 0;
                     }),
                     new CosmosAnimation({
                        anchor: { x: 0, y: 1 },
                        position: { x: 260 },
                        resources: content.iocHJusticeDown
                     }).on('tick', function () {
                        this.alpha.value = SAVE.data.n.state_citadel_archive > 5 ? 1 : 0;
                     })
                  ]
               }).on('tick', function () {
                  if (SAVE.data.s.room[0] === 'c' && SAVE.data.s.room.startsWith('c_archive')) {
                     this.alpha.value = 1;
                  } else {
                     this.alpha.value = 0;
                  }
               }),
               new CosmosAnimation({
                  anchor: { x: 0, y: 1 },
                  position: { x: 160 },
                  resources: content.iocAsrielDown
               }).on('tick', function () {
                  this.alpha.value = world.genocide ? 1 : 0;
               })
            ]
         }),
         new CosmosObject({
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(140, 132 - 4, () => SAVE.data.s.name || text.general.mystery1),
               menuText(280, 132 - 4, () =>
                  SAVE.data.s.room.startsWith('c_archive')
                     ? `${text.general.xm} ${SAVE.data.n.xm + 1}`
                     : `${text.general.lv} ${calcLV()}`
               ),
               menuText(498, 132 - 4, () => displayTime(SAVE.data.n.time), {
                  anchor: { x: 1 }
               }),
               menuText(140, 168 - 4, () => CosmosUtils.provide(saver.locations.of(SAVE.data.s.room).name)),
               menuText(
                  0,
                  218 - 4,
                  () =>
                     `§fill:${menuFinder('frontEndLoad', 'continue') ? '#ff0' : '#fff'}§${
                        (SAVE.data.b.freedom && SAVE.flag.b.true_reset) || SAVE.flag.b.lv20
                           ? text.menu.load2
                           : text.menu.load1
                     }`
               ).on('tick', function () {
                  this.position.x = (SAVE.data.b.freedom && SAVE.flag.b.true_reset) || SAVE.flag.b.lv20 ? 81 : 85;
               }),
               menuText(
                  0,
                  218 - 4,
                  () =>
                     `§fill:${
                        menuFinder('frontEndLoad', 'reset')
                           ? '#ff0'
                           : !SAVE.flag.b.true_reset && SAVE.data.n.plot === 72
                           ? '#808080'
                           : '#fff'
                     }§${SAVE.flag.b.true_reset ? text.menu.load4 : text.menu.load3}`
               ).on('tick', function () {
                  this.position.x = SAVE.flag.b.true_reset ? 175 : 195;
               }),
               menuText(
                  264,
                  258 - 4,
                  () => `§fill:${menuFinder('frontEndLoad', 'settings') ? '#ff0' : '#fff'}§${text.general.settings}`
               ),
               menuText(320, 464 - 2, () => text.menu.footer, {
                  anchor: { x: 0 },
                  fill: '#808080',
                  fontName: 'CryptOfTomorrow',
                  fontSize: 8
               })
            ]
         })
      ]
   }),
   frontEndName: new CosmosNavigator({
      flip: true,
      grid: [ ...text.menu.name5, [ 'quit', 'backspace', 'done' ] ],
      next (self) {
         const selection = self.selection() as string;
         switch (selection) {
            case 'quit':
               frontEnder.name.value = '';
               if (frontEnder.trueReset) {
                  frontEnder.trueReset = false;
                  return 'frontEndLoad';
               } else {
                  return 'frontEndStart';
               }
            case 'backspace':
               frontEnder.name.value.length > 0 && (frontEnder.name.value = frontEnder.name.value.slice(0, -1));
               break;
            case 'done':
               return 'frontEndNameConfirm';
            default:
               if (frontEnder.name.value.length < 6) {
                  frontEnder.name.value += selection;
               } else {
                  frontEnder.name.value = frontEnder.name.value.slice(0, 5) + selection;
               }
         }
      },
      prev () {
         frontEnder.name.value.length > 0 && (frontEnder.name.value = frontEnder.name.value.slice(0, -1));
      },
      objects: [
         frontEnder.createBackground(),
         new CosmosObject({
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(168, 68 - 4, () => text.menu.name1),
               menuText(280, 118 - 4, () => frontEnder.name.value),
               new CosmosObject().on('tick', function () {
                  const namerange = namerangeGen();
                  if (this.metadata.namerange !== namerange) {
                     this.metadata.namerange = namerange;
                     this.objects = namerange.map((letter, index) => {
                        const { x, y } = text.menu.name6(index);
                        return menuText(
                           x,
                           y - 4,
                           () =>
                              `§offset:0.5,0.5§§random:1,1§§fill:${
                                 menuFinder('frontEndName', letter) ? '#ff0' : '#fff'
                              }§${letter}`
                        );
                     });
                  }
               }),
               menuText(
                  120,
                  408 - 4,
                  () => `§fill:${menuFinder('frontEndName', 'quit') ? '#ff0' : '#fff'}§${text.menu.name2}`
               ),
               menuText(
                  240,
                  408 - 4,
                  () => `§fill:${menuFinder('frontEndName', 'backspace') ? '#ff0' : '#fff'}§${text.menu.name3}`
               ),
               menuText(
                  440,
                  408 - 4,
                  () => `§fill:${menuFinder('frontEndName', 'done') ? '#ff0' : '#fff'}§${text.menu.name4}`
               )
            ]
         })
      ]
   }),
   frontEndNameConfirm: new CosmosNavigator<string>({
      flip: true,
      grid: () => [
         frontEnder.name.blacklist.includes(frontEnder.name.value_true.toLowerCase()) ? [ 'no' ] : [ 'no', 'yes' ]
      ],
      next (self) {
         if (self.selection() === 'no') {
            return SAVE.data.s.name && !frontEnder.trueReset ? 'frontEndLoad' : 'frontEndName';
         } else {
            fastAssets().map(asset => asset.unload());
            rooms.of(spawn).preload.load();
            frontEnder.menuMusic?.stop();
            game.input = false;
            const snd = sounds.cymbal.instance(renderer);
            const fader = atlas.navigators.of('frontEndNameConfirm').objects[2];
            fader.alpha.value = 0;
            fader.alpha.modulate(renderer, 5000, 1).then(() => {
               snd.stop();
               content.asCymbal.unload();

               // clear data
               if (frontEnder.name.value) {
                  if (frontEnder.trueReset) {
                     for (const key of SAVE.keys()) {
                        key.startsWith(SAVE.namespace) && SAVE.manager.removeItem(key);
                     }
                  }
                  SAVE.state = { s: { name: frontEnder.name.value, room: spawn } };
                  SAVE.save();
                  frontEnder.name.value = '';
               } else {
                  SAVE.state = { s: { name: SAVE.data.s.name, room: spawn } };
                  for (const key of SAVE.keys()) {
                     if (key.startsWith(SAVE.namespace) && key.split(':').at(-1)?.[0] === '_') {
                        SAVE.hostages[key] = null;
                     }
                  }
               }

               // do the teleport
               events.fire('spawn');
            });
         }
      },
      prev: () => (SAVE.data.s.name && !frontEnder.trueReset ? 'frontEndLoad' : 'frontEndName'),
      objects: [
         frontEnder.createBackground(),
         new CosmosObject({
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(180, 68 - 4, () => {
                  if (SAVE.data.s.name && !frontEnder.trueReset) {
                     return text.menu.confirm2;
                  } else {
                     const lower = frontEnder.name.value.toLowerCase();
                     if (lower in text.menu.confirm4) {
                        return CosmosTextUtils.format(
                           text.menu.confirm4[lower as keyof typeof text.menu.confirm4],
                           24,
                           true
                        );
                     } else {
                        return text.menu.confirm1;
                     }
                  }
               }).on('tick', function () {
                  this.alpha.value = game.input ? 1 : 0;
               }),
               new CosmosObject({
                  objects: [
                     menuText(0, 0, () => frontEnder.name.value_true).on('tick', function () {
                        this.position.x = Math.random() / 2;
                        this.position.y = Math.random() / 2;
                        this.rotation.value = (Math.random() - 0.5) * frontEnder.name.shake.value;
                     })
                  ]
               }),
               menuText(
                  146,
                  408 - 4,
                  () =>
                     `§fill:${menuFinder('frontEndNameConfirm', 'no') ? '#ff0' : '#fff'}§${
                        frontEnder.name.blacklist.includes(frontEnder.name.value_true.toLowerCase())
                           ? text.menu.confirm3
                           : text.general.no
                     }`
               ).on('tick', function () {
                  this.alpha.value = game.input ? 1 : 0;
               }),
               menuText(
                  460,
                  408 - 4,
                  () =>
                     `§fill:${menuFinder('frontEndNameConfirm', 'yes') ? '#ff0' : '#fff'}§${
                        frontEnder.name.blacklist.includes(frontEnder.name.value_true.toLowerCase())
                           ? ''
                           : text.general.yes
                     }`
               ).on('tick', function () {
                  this.alpha.value = game.input ? 1 : 0;
               })
            ]
         }),
         new CosmosRectangle({
            alpha: 0,
            fill: '#fff',
            stroke: '',
            size: { x: 320, y: 240 }
         })
      ]
   }).on('from', function () {
      const name = this.objects[1].objects[1];
      name.scale.x = 1;
      name.scale.y = 1;
      name.position.x = 140;
      name.position.y = 55;
      frontEnder.name.shake.value = 0;
      name.scale.modulate(renderer, 4000, { x: 3.4, y: 3.4 });
      name.position.modulate(renderer, 4000, { x: 100, y: 115 });
      frontEnder.name.shake.modulate(renderer, 4000, 2);
   }),
   frontEndSettings: new CosmosNavigator<string>({
      grid: () => [
         [
            'exit',
            'language',
            'sfx',
            'music',
            'fancy',
            'epilepsy',
            ...(isMobile.any ? [ 'right' ] : []),
            ...(SAVE.flag.s.$gamepad_input_f === '' ? [] : [ 'deadzone' ]),
            ...(backend === null ? [] : [ 'mods' ])
         ]
      ],
      next (self) {
         const selection = self.selection() as string;
         switch (selection) {
            case 'exit':
               return frontEnder.closeSettings();
            case 'language': {
               translator.updateLanguage(
                  (SAVE.flag.s.$option_language =
                     translator.langs[
                        (translator.langs.indexOf(SAVE.flag.s.$option_language) + 1) % translator.langs.length
                     ])
               );
               document.title = text.extra.title;
               break;
            }
            case 'music':
               SAVE.flag.b.$option_music = !SAVE.flag.b.$option_music;
               frontEnder.testMusic();
               break;
            case 'sfx':
               SAVE.flag.b.$option_sfx = !SAVE.flag.b.$option_sfx;
               frontEnder.testSFX();
               break;
            case 'fancy':
               SAVE.flag.b.$option_fancy = !SAVE.flag.b.$option_fancy;
               frontEnder.updateFancy();
               break;
            case 'epilepsy':
               SAVE.flag.b.$option_epilepsy = !SAVE.flag.b.$option_epilepsy;
               frontEnder.updateEpilepsy();
               break;
            case 'right':
               SAVE.flag.b.$option_right = !SAVE.flag.b.$option_right;
               frontEnder.updateRight();
               break;
            case 'mods':
               backend?.exec('mods');
               break;
         }
      },
      prev () {
         return frontEnder.closeSettings();
      },
      objects: [
         frontEnder.createBackground(Number.MAX_SAFE_INTEGER),
         new CosmosObject({
            fontName: 'DeterminationSans',
            fontSize: 16,
            priority: Number.MAX_SAFE_INTEGER,
            objects: [
               // 60px base indent, +28px for each line (2 lines would have 88 px indent)
               menuText(208, 36 - 4, () => text.menu.settings1, {
                  fontName: 'DeterminationSans',
                  fontSize: 32
               }),
               menuText(
                  40,
                  84,
                  () => `§fill:${menuFinder('frontEndSettings', 'exit') ? '#ff0' : '#fff'}§${text.menu.settings2}`
               ),
               menuText(
                  40,
                  84 + 41,
                  () => `§fill:${menuFinder('frontEndSettings', 'language') ? '#ff0' : '#fff'}§${text.menu.settings3}`
               ),
               menuText(
                  360,
                  84 + 41,
                  () => `§fill:${menuFinder('frontEndSettings', 'language') ? '#ff0' : '#fff'}§${text.menu.settings3a}`
               ),
               menuText(
                  40,
                  84 + 41 * 2,
                  () => `§fill:${menuFinder('frontEndSettings', 'sfx') ? '#ff0' : '#fff'}§${text.menu.settings4}`
               ),
               menuText(360, 84 + 41 * 2, () => {
                  return `§fill:${menuFinder('frontEndSettings', 'sfx') ? '#ff0' : '#fff'}§${
                     SAVE.flag.b.$option_sfx ? text.general.disabled : text.general.percent
                  }`.replace('$(x)', Math.round((1 - SAVE.flag.n.$option_sfx) * 100).toString());
               }),
               menuText(
                  40,
                  84 + 41 * 3,
                  () => `§fill:${menuFinder('frontEndSettings', 'music') ? '#ff0' : '#fff'}§${text.menu.settings5}`
               ),
               menuText(360, 84 + 41 * 3, () => {
                  return `§fill:${menuFinder('frontEndSettings', 'music') ? '#ff0' : '#fff'}§${
                     SAVE.flag.b.$option_music ? text.general.disabled : text.general.percent
                  }`.replace('$(x)', Math.round((1 - SAVE.flag.n.$option_music) * 100).toString());
               }),
               menuText(
                  40,
                  84 + 41 * 4,
                  () => `§fill:${menuFinder('frontEndSettings', 'fancy') ? '#ff0' : '#fff'}§${text.menu.settings6}`
               ),
               menuText(
                  360,
                  84 + 41 * 4,
                  () =>
                     `§fill:${menuFinder('frontEndSettings', 'fancy') ? '#ff0' : '#fff'}§${
                        SAVE.flag.b.$option_fancy ? text.general.enabled : text.general.disabled
                     }`
               ),
               menuText(
                  40,
                  84 + 41 * 5,
                  () => `§fill:${menuFinder('frontEndSettings', 'epilepsy') ? '#ff0' : '#fff'}§${text.menu.settings7}`
               ),
               menuText(
                  360,
                  84 + 41 * 5,
                  () =>
                     `§fill:${menuFinder('frontEndSettings', 'epilepsy') ? '#ff0' : '#fff'}§${
                        SAVE.flag.b.$option_epilepsy ? text.menu.settings7b : text.menu.settings7a
                     }`
               ),
               menuText(
                  40,
                  84 + 41 * 6,
                  () => `§fill:${menuFinder('frontEndSettings', 'right') ? '#ff0' : '#fff'}§${text.menu.settings8}`,
                  { alpha: isMobile.any ? 1 : 0 }
               ),
               menuText(
                  360,
                  84 + 41 * 6,
                  () =>
                     `§fill:${menuFinder('frontEndSettings', 'right') ? '#ff0' : '#fff'}§${
                        SAVE.flag.b.$option_right ? text.menu.settings8b : text.menu.settings8a
                     }`,
                  { alpha: isMobile.any ? 1 : 0 }
               ),
               menuText(
                  40,
                  84 + 41 * (isMobile.any ? 7 : 6),
                  () => `§fill:${menuFinder('frontEndSettings', 'deadzone') ? '#ff0' : '#fff'}§${text.menu.settings9}`
               ).on('tick', function () {
                  this.alpha.value = SAVE.flag.s.$gamepad_input_f === '' ? 0 : 1;
               }),
               menuText(
                  360,
                  84 + 41 * (isMobile.any ? 7 : 6),
                  () =>
                     `§fill:${
                        menuFinder('frontEndSettings', 'deadzone') ? '#ff0' : '#fff'
                     }§${text.general.percent.replace(
                        '$(x)',
                        (Math.round(SAVE.flag.n.$option_deadzone * 100) / 100).toString()
                     )}`
               ).on('tick', function () {
                  this.alpha.value = SAVE.flag.s.$gamepad_input_f === '' ? 0 : 1;
               }),
               menuText(
                  40,
                  84 + 41 * 8,
                  () => `§fill:${menuFinder('frontEndSettings', 'mods') ? '#ff0' : '#fff'}§${text.menu.settings10}`,
                  { alpha: backend === null ? 0 : 1 }
               )
            ]
         })
      ]
   }).on('from', async function () {
      this.position = { x: 0, y: 0 };
      frontEnder.language = SAVE.flag.s.$option_language;
   }),
   frontEndStart: new CosmosNavigator({
      grid: [ [ 'begin', 'settings' ] ],
      next: self => (self.selection() === 'begin' ? 'frontEndName' : 'frontEndSettings'),
      objects: [
         frontEnder.createBackground(),
         new CosmosObject({
            fill: '#c0c0c0',
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(176, 48 - 4, () => text.menu.start1[0], {}, false),
               menuText(170, 108 - 4, () => text.menu.start1[1], {}, false),
               menuText(170, 144 - 4, () => text.menu.start1[2], {}, false),
               menuText(170, 180 - 4, () => text.menu.start1[3], {}, false),
               menuText(170, 216 - 4, () => text.menu.start1[4], {}, false),
               menuText(170, 252 - 4, () => text.menu.start1[5], {}, false),
               menuText(170, 288 - 4, () => text.menu.start1[6], {}, false),
               menuText(
                  170,
                  352 - 4,
                  () => `§fill:${menuFinder('frontEndStart', 'begin') ? '#ff0' : '#fff'}§${text.menu.start2}`
               ),
               menuText(
                  170,
                  392 - 4,
                  () => `§fill:${menuFinder('frontEndStart', 'settings') ? '#ff0' : '#fff'}§${text.general.settings}`
               ),
               menuText(320, 464 - 2, () => text.menu.footer, {
                  anchor: { x: 0 },
                  fill: '#808080',
                  fontName: 'CryptOfTomorrow',
                  fontSize: 8
               })
            ]
         })
      ]
   }),
   save: new CosmosNavigator({
      flip: true,
      grid: () => [ saver.yellow ? [ 'done', 'done' ] : [ 'save', 'return' ] ],
      next (self) {
         if (self.selection() === 'save') {
            saver.save();
            saver.yellow = true;
            content.asSave.loaded && sounds.save.instance(renderer);
         } else {
            return null;
         }
      },
      prev: null,
      objects: [
         menuBox(108, 118, 412, 162, 6, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               new CosmosObject({
                  objects: [
                     menuText(
                        26,
                        24 - 4,
                        () =>
                           (SAVE.flag.n.pacifist_marker === 16 ? text.general.asriel : SAVE.data.s.name) ||
                           text.general.mystery1,
                        {},
                        false
                     ),
                     menuText(
                        158,
                        24 - 4,
                        () =>
                           SAVE.flag.n.pacifist_marker === 16
                              ? ''
                              : world.archive
                              ? `${text.general.xm} ${SAVE.data.n.xm + 1}`
                              : `${text.general.lv} ${calcLV()}`,
                        {},
                        false
                     ),
                     menuText(
                        384,
                        24 - 4,
                        () => displayTime(saver.yellow ? saver.time : SAVE.data.n.time),
                        { anchor: { x: 1 } },
                        false
                     ),
                     menuText(
                        26,
                        64 - 4,
                        () =>
                           SAVE.flag.n.pacifist_marker === 16
                              ? text.general.asriel_location
                              : CosmosUtils.provide(saver.locations.of(SAVE.data.s.room).name),
                        {},
                        false
                     ),
                     menuSOUL(28, 124, 'save', 'save'),
                     menuText(56, 124 - 4, () => (saver.yellow ? text.menu.save3 : text.menu.save1), {}, false),
                     menuSOUL(208, 124, 'save', 'return'),
                     menuText(236, 124 - 4, () => (saver.yellow ? '' : text.menu.save2), {}, false)
                  ]
               }).on('tick', function () {
                  this.fill = saver.yellow ? '#ff0' : '#fff';
               })
            ]
         })
      ]
   })
      .on('to', () => {
         saver.yellow = false;
         game.movement = true;
      })
      .on('from', function () {
         this.position = { x: 0, y: 0 };
      }),
   shop: new CosmosNavigator({
      grid: () => [ CosmosUtils.populate(CosmosUtils.provide(shopper.value!.size), index => index) ],
      next: () => void shopper.value!.handler(),
      prev: () => void typer.skip(),
      objects: [
         menuBox(420, 78 + 162, 206, 154, 8, {
            metadata: {
               mode: 0
            },
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(30, 20 - 4, () => CosmosUtils.provide(shopper.value!.tooltip) || '', {
                  spacing: { y: 3 }
               })
            ]
         }).on('tick', function () {
            this.metadata.mode ??= 0;
            const tooltip = CosmosUtils.provide(shopper.value!.tooltip);
            if (this.metadata.mode === 0 && tooltip !== null) {
               this.metadata.mode = 1;
               this.position.modulate(
                  renderer,
                  500 * ((this.position.y - 39) / 120),
                  { x: 210, y: 39 },
                  { x: 210, y: 39 }
               );
            } else if (this.metadata.mode === 1 && tooltip === null) {
               this.metadata.mode = 0;
               this.position.modulate(
                  renderer,
                  500 * (1 - (this.position.y - 39) / 120),
                  { x: 210, y: 120 },
                  { x: 210, y: 120 }
               );
            }
            const diff = (this.position.y - 120) * 2;
            for (const object of this.objects[1].objects as CosmosSprite[]) {
               if (object instanceof CosmosAnimation) {
                  object.subcrop.top = 248 + diff;
                  object.subcrop.bottom = -402 + diff;
               } else {
                  object.crop.top = 248 + diff;
                  object.crop.bottom = -402 + diff;
               }
            }
         }),
         menuBox(-2, 240, 414, 226, 8, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(34, 20 - 4, () => game.text, {
                  fontName: 'DeterminationMono',
                  fontSize: 16,
                  spacing: { y: 5 }
               }).on('tick', function () {
                  this.alpha.value = atlas.target === 'shop' ? 1 : 0;
               }),
               ...CosmosUtils.populate(10, index => {
                  const row = Math.floor(index / 2);
                  if (index % 2) {
                     return new CosmosSprite({
                        frames: [ content.ieSOUL ],
                        position: { x: 24 / 2, y: (20 + row * 40) / 2 }
                     }).on('tick', function () {
                        this.alpha.value = menuFinder(
                           'shopList',
                           0,
                           row +
                              Math.min(
                                 Math.max(atlas.navigators.of('shopList').position.y - 2, 0),
                                 Math.max(CosmosUtils.provide(shopper.value!.size) - 5, 0)
                              )
                        )
                           ? 1
                           : 0;
                     });
                  } else {
                     return menuText(
                        54,
                        20 + row * 40 - 4,
                        () =>
                           CosmosUtils.provide(shopper.value!.options)[
                              row +
                                 Math.min(
                                    Math.max(atlas.navigators.of('shopList').position.y - 2, 0),
                                    Math.max(CosmosUtils.provide(shopper.value!.size) - 5, 0)
                                 )
                           ] || ''
                     ).on('tick', function () {
                        this.alpha.value = [ 'shopList', 'shopPurchase' ].includes(atlas.target!) ? 1 : 0;
                     });
                  }
               })
            ]
         }),
         menuBox(420, 240, 206, 226, 8, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(30, 20 - 4, () => game.text, {
                  fontName: 'DeterminationMono',
                  fontSize: 16,
                  spacing: { y: 5 }
               }).on('tick', function () {
                  this.alpha.value = atlas.target === 'shopList' ? 1 : 0;
               }),
               menuText(
                  32,
                  180 - 4,
                  () => `${SAVE.data.n.g === Infinity ? text.general.inf : SAVE.data.n.g}${text.general.g}`
               ),
               menuText(132, 180 - 4, () => `${SAVE.storage.inventory.size}/8`),
               ...CosmosUtils.populate(10, index => {
                  const row = Math.floor(index / 2);
                  if (index % 2) {
                     return menuSOUL(22, 20 + row * 40, 'shop', 0, row);
                  } else {
                     return menuText(
                        52,
                        20 + row * 40 - 4,
                        () => CosmosUtils.provide(shopper.value!.options)[row] || ''
                     ).on('tick', function () {
                        this.alpha.value = atlas.target === 'shop' ? 1 : 0;
                     });
                  }
               })
            ]
         })
      ]
   })
      .on('from', async from => {
         from === null && atlas.attach(renderer, 'menu', 'shop');
         dialogue_primitive(CosmosUtils.provide(shopper.value!.status));
      })
      .on('to', () => {
         typer.reset(true);
         game.text = '';
      }),
   shopList: new CosmosNavigator({
      grid: () => [ CosmosUtils.populate(CosmosUtils.provide(shopper.value!.size), index => index) ],
      next: () => void shopper.value!.handler(),
      prev: 'shop'
   })
      .on('from', async () => {
         dialogue_primitive(CosmosUtils.provide(shopper.value!.status));
      })
      .on('to', () => {
         typer.reset(true);
         game.text = '';
      }),
   shopText: new CosmosNavigator({
      next: () => void typer.read(),
      prev: () => void typer.skip(),
      objects: [
         menuBox(-2, 240, 628, 226, 8, {
            objects: [
               menuText(54, 20 - 4, () => game.text, {
                  fontName: 'DeterminationMono',
                  fontSize: 16,
                  spacing: { y: 5 }
               })
            ]
         })
      ]
   }).on('to', to => {
      typer.reset(true);
      game.text = '';
      if (to === null) {
         atlas.detach(renderer, 'menu', 'shop');
         shopper.value!.vars = {};
      }
   }),
   shopPurchase: new CosmosNavigator({
      flip: true,
      grid: [ [ 0, 1 ] ],
      next (self) {
         return shopper.value!.purchase(self.selection() === 0) ? void 0 : 'shopList';
      },
      prev () {
         return shopper.value!.purchase(false) ? void 0 : 'shopList';
      },
      objects: [
         new CosmosObject({
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(
                  460,
                  268 - 4,
                  () =>
                     CosmosUtils.provide(shopper.value!.prompt).replace(
                        '$(x)',
                        CosmosUtils.provide(shopper.value!.price).toString()
                     ),
                  { spacing: { y: 2 } }
               ),
               menuSOUL(450, 378, 'shopPurchase', 0, 0),
               menuText(480, 378 - 4, () => text.general.yes),
               menuSOUL(545, 378, 'shopPurchase', 0, 1),
               menuText(575, 378 - 4, () => text.general.no)
            ]
         })
      ]
   }),

   sidebar: new CosmosNavigator({
      grid: () => [ [ 'item', 'stat', 'cell' ] ],
      next (self) {
         switch (self.selection()) {
            case 'item':
               if (SAVE.storage.inventory.size > 0) {
                  return 'sidebarItem';
               } else {
                  break;
               }
            case 'stat':
               return 'sidebarStat';
            case 'cell':
               if (SAVE.data.n.plot < 3 || world.archive) {
                  atlas.detach(renderer, 'menu', 'sidebar');
                  sidebarrer.openSettings();
                  break;
               } else {
                  return 'sidebarCell';
               }
         }
      },
      prev: null,
      objects: [
         menuBox(32, 52, 130, 98, 6, {
            fontName: 'CryptOfTomorrow',
            fontSize: 8,
            objects: [
               menuText(8, 10 - 4, () => SAVE.data.s.name || text.general.mystery1, {
                  fontName: 'DeterminationSans',
                  fontSize: 16
               }),
               menuText(8, 42 - 2, () => (world.archive ? text.general.xm : text.general.lv)),
               menuText(8, 60 - 2, () => text.general.hp),
               menuText(8, 78 - 2, () => (world.archive ? text.menu.sidebar5 : text.general.g)),
               menuText(44, 42 - 2, () => (world.archive ? SAVE.data.n.xm + 1 : calcLV()).toString()),
               menuText(
                  44,
                  60 - 2,
                  () =>
                     `${SAVE.data.n.hp === Infinity ? text.general.inf : SAVE.data.n.hp}${
                        world.archive ? '' : `/${calcHP()}`
                     }`
               ),
               menuText(44, 78 - 2, () =>
                  world.archive
                     ? text.general.nominal
                     : (SAVE.data.n.g === Infinity ? text.general.inf : SAVE.data.n.g).toString()
               )
            ]
         }),
         menuBox(32, 168, 130, 136, 6, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuSOUL(18, 22, 'sidebar', 'item'),
               menuSOUL(18, 58, 'sidebar', 'stat'),
               menuSOUL(18, 94, 'sidebar', 'cell'),
               menuText(
                  46,
                  22 - 4,
                  () => `${SAVE.storage.inventory.size > 0 ? '' : '§fill:#808080§'}${text.menu.sidebar1}`
               ),
               menuText(46, 58 - 4, () => text.menu.sidebar2),
               menuText(46, 94 - 4, () =>
                  SAVE.data.n.plot < 3 || world.archive ? text.menu.sidebar4 : text.menu.sidebar3
               )
            ]
         })
      ]
   })
      .on('from', key => {
         switch (key) {
            case null:
               atlas.attach(renderer, 'menu', 'sidebar');
               sounds.menu.instance(renderer);
               break;
            case 'sidebarItem':
            case 'sidebarStat':
            case 'sidebarCell':
               atlas.detach(renderer, 'menu', key);
               break;
         }
      })
      .on('to', key => {
         switch (key) {
            case null:
               atlas.detach(renderer, 'menu', 'sidebar');
               game.movement = true;
               break;
            case 'sidebarItem':
            case 'sidebarStat':
            case 'sidebarCell':
               atlas.attach(renderer, 'menu', key);
               break;
         }
      }),
   sidebarItem: new CosmosNavigator({
      grid: () => [ [ ...CosmosUtils.populate(SAVE.storage.inventory.size, index => index) ] ],
      next: 'sidebarItemOption',
      prev: 'sidebar',
      objects: [
         menuBox(188, 52, 334, 350, 6, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               ...CosmosUtils.populate(16, index => {
                  const row = Math.floor(index / 2);
                  if (index % 2) {
                     return menuSOUL(14, 30 + row * 32, 'sidebarItem', 0, row);
                  } else {
                     return menuText(38, 30 + row * 32 - 4, () => {
                        const key = SAVE.storage.inventory.of(row);
                        if (key) {
                           return CosmosUtils.provide(items.of(key).text.name);
                        } else {
                           return '';
                        }
                     });
                  }
               }),
               menuSOUL(14, 310, 'sidebarItemOption', 0, 0),
               menuSOUL(110, 310, 'sidebarItemOption', 0, 1).on('tick', function () {
                  this.offsets[0].x = sidebarrer.use ? text.menu.item1_offset : text.menu.item2_offset;
               }),
               menuSOUL(224, 310, 'sidebarItemOption', 0, 2),
               menuText(38, 310 - 4, () => (sidebarrer.use ? text.menu.item1 : text.menu.item2)),
               menuText(134, 310 - 4, () => text.menu.item3).on('tick', function () {
                  this.offsets[0].x = sidebarrer.use ? text.menu.item1_offset : text.menu.item2_offset;
               }),
               menuText(248, 310 - 4, () => text.menu.item4)
            ]
         })
      ]
   }),
   sidebarItemOption: new CosmosNavigator<string>({
      flip: true,
      grid: [ [ 'use', 'info', 'drop' ] ],
      next (self) {
         const index = atlas.navigators.of('sidebarItem').position.y;
         const item = SAVE.storage.inventory.of(index)!;
         const selection = self.selection() as 'use' | 'info' | 'drop';
         sidebarrer.use_movement = true;
         atlas.switch('dialoguerBottom');
         (selection === 'use'
            ? use(item, index)
            : dialogue_primitive(...CosmosUtils.provide(items.of(item).text[selection]))
         ).then(async () => {
            atlas.switch(null);
            atlas.detach(renderer, 'menu', 'sidebar');
            if (selection === 'drop') {
               SAVE.storage.inventory.remove(index);
               await Promise.all(events.fire('drop', item, index));
            }
            game.movement = sidebarrer.use_movement;
         });
      },
      prev: 'sidebarItem'
   }).on('to', function (key) {
      this.position = { x: 0, y: 0 };
      if (key === 'dialoguerBottom') {
         atlas.detach(renderer, 'menu', 'sidebarItem');
      }
   }),
   sidebarStat: new CosmosNavigator({
      prev: 'sidebar',
      objects: [
         menuBox(188, 52, 334, 406, 6, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(22, 34 - 4, () => `"${SAVE.data.s.name || text.general.mystery1}"`),
               menuText(
                  22,
                  94 - 4,
                  () =>
                     `${world.archive ? text.general.xm : text.general.lv} \xa0\xa0\xa0${
                        world.archive ? SAVE.data.n.xm + 1 : calcLV()
                     }` + ' §fill:#f0f§(KARMA ON)'
               ),
               menuText(
                  22,
                  126 - 4,
                  () =>
                     `${text.general.hp} \xa0\xa0\xa0${
                        SAVE.data.n.hp === Infinity ? text.general.inf : SAVE.data.n.hp
                     }${world.archive ? '' : ` / ${calcHP()}`}`
               ),
               menuText(
                  22,
                  190 - 4,
                  () =>
                     `${text.menu.stat1} \xa0\xa0\xa0${calcAT()} (${
                        items.of(SAVE.data.s.weapon).value + (SAVE.data.s.armor === 'temyarmor' ? 10 : 0)
                     })`
               ),
               menuText(
                  22,
                  222 - 4,
                  () => `${text.menu.stat2} \xa0\xa0\xa0${calcDF()} (${items.of(SAVE.data.s.armor).value})`
               ),
               menuText(
                  22,
                  252 - 4,
                  () => {
                     var nokr_inv = mechanics.base_inv + (items.of(SAVE.data.s.armor).inv ?? 0) + (items.of(SAVE.data.s.weapon).inv ?? 0);
                     var actual_inv = Math.round(battler.stat.invulnerability.compute());
                     return `${text.menu.stat13} \xa0\xa0\xa0${nokr_inv}${actual_inv < nokr_inv ? `§fill:#f0f§-${nokr_inv - actual_inv}` : ''}`
                  }
               ),
               menuText(22, 282 - 4, () => `${text.menu.stat3}: ${items.of(SAVE.data.s.weapon).text.name}`),
               menuText(22, 314 - 4, () => `${text.menu.stat4}: ${items.of(SAVE.data.s.armor).text.name}`),
               menuText(22, 354 - 4, () =>
                  world.archive
                     ? `${text.menu.stat12}: ${text.general.nominal}`
                     : `${text.menu.stat5}: ${SAVE.data.n.g === Infinity ? text.general.inf : SAVE.data.n.g}`
               ),
               menuText(190, 354 - 4, () =>
                  world.archive
                     ? ''
                     : world.trueKills > 9
                     ? `${text.menu.stat9}: ${world.trueKills}`
                     : SAVE.data.n.bully > 9
                     ? `${text.menu.stat10}: ${SAVE.data.n.bully}`
                     : world.flirt > 9
                     ? `${text.menu.stat11}: ${world.flirt}`
                     : ''
               ).on('tick', function () {
                  this.fill =
                     world.trueKills > 9
                        ? '#ff0000'
                        : SAVE.data.n.bully > 9
                        ? '#3f00ff'
                        : world.flirt > 9
                        ? '#cf7fff'
                        : void 0;
               }),
               menuText(190, 190 - 4, () =>
                  world.archive
                     ? ''
                     : `${text.menu.stat6}: ${SAVE.data.n.exp === Infinity ? text.general.inf : SAVE.data.n.exp}`
               ),
               menuText(190, 222 - 4, () => (world.archive ? '' : `${text.menu.stat7}: ${calcNX() ?? 0}`)),
               menuText(190, 34 - 4, () => (SAVE.data.s.name === '' ? text.menu.stat8 : ''), {
                  spacing: { y: 3 },
                  metadata: { f: [ new GlitchFilter({ slices: 50, offset: 2.5 }) ], t: 0 }
               }).on('tick', function () {
                  if (SAVE.data.s.name === '') {
                     this.area = renderer.area!;
                     if (this.metadata.t-- === 0) {
                        this.metadata.t = 2;
                        this.filters = this.metadata.f;
                        this.metadata.f[0].offset = 1;
                        this.metadata.f[0].refresh();
                     }
                  } else {
                     this.area = null;
                     this.filters = null;
                  }
               })
            ]
         })
      ]
   }),
   sidebarCell: new CosmosNavigator<string>({
      grid () {
         if (atlas.target === null) {
            return [ [ 0 ] ];
         } else {
            return [
               [
                  ...[ ...phone.entries() ]
                     .filter(entry => entry[1].display())
                     .sort((a, b) => CosmosUtils.provide(a[1].priority ?? 0) - CosmosUtils.provide(b[1].priority ?? 0))
                     .map(entry => entry[0]),
                  null
               ]
            ];
         }
      },
      next: self => {
         const selection = self.selection();
         if (selection === null) {
            sidebarrer.openSettings();
         } else if (typeof selection === 'number') {
            sidebarrer.dimbox = [ 'dimboxA', 'dimboxB' ][selection] as 'dimboxA' | 'dimboxB';
            return 'sidebarCellBox';
         } else {
            phone.of(selection).trigger();
         }
      },
      prev: 'sidebar',
      objects: [
         menuBox(188, 52, 334, 302, 6, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               ...CosmosUtils.populate(14, index => {
                  const row = Math.floor(index / 2);
                  if (index % 2 === 0) {
                     return new CosmosSprite({
                        frames: [ content.ieSOUL ],
                        position: { x: 14 / 2, y: (30 + row * 32) / 2 },
                        priority: 1
                     });
                  } else {
                     return new CosmosText({
                        fill: '#fff',
                        position: { x: 38 / 2, y: (30 + row * 32 - 4) / 2 },
                        stroke: ''
                     });
                  }
               }),
               new CosmosSprite({
                  frames: [ content.ieSOUL ],
                  position: { x: 14 / 2, y: (30 + 7 * 32) / 2 },
                  priority: 1
               }),
               menuText(38, 30 + 7 * 32 - 4, () => {
                  return text.general.settings;
               })
            ]
         }).on('tick', function () {
            const list = CosmosUtils.provide(atlas.navigators.of('sidebarCell').grid)[0].slice(0, -1) as string[];
            for (const [ index, obj ] of this.objects[2].objects.entries()) {
               if (index < 14) {
                  const row = Math.floor(index / 2);
                  if (index % 2 === 0) {
                     if (row < list.length) {
                        obj.alpha.value = menuFinder('sidebarCell', 0, row) ? 1 : 0;
                     } else {
                        obj.alpha.value = 0;
                     }
                  } else {
                     (obj as CosmosText).content = CosmosUtils.provide(
                        phone.of(CosmosUtils.provide(atlas.navigators.of('sidebarCell').grid)[0][row]).name
                     );
                  }
               } else if (index === 14) {
                  obj.alpha.value = menuFinder('sidebarCell', 0, list.length) ? 1 : 0;
               }
            }
         })
      ]
   }).on('to', key => {
      if (key !== 'sidebar') {
         atlas.detach(renderer, 'menu', 'sidebarCell', ...((key === 'dialoguerBottom' ? [] : [ 'sidebar' ]) as string[]));
      }
   }),
   sidebarCellBox: new CosmosNavigator({
      next (self) {
         const dimbox = SAVE.storage[sidebarrer.dimbox];
         const source = [ SAVE.storage.inventory, dimbox ][self.position.x];
         const item = source.of(self.position.y);
         if (item && [ dimbox, SAVE.storage.inventory ][self.position.x].add(item)) {
            source.remove(self.position.y);
         }
      },
      prev: null,
      grid: () => [ CosmosUtils.populate(8, index => `i${index}`), CosmosUtils.populate(10, index => `b${index}`) ],
      objects: [
         menuBox(16, 16, 598, 438, 6, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(82 + 5.5, 16 - 4, () => text.menu.box1),
               menuText(426 + 2.5, 16 - 4, () => text.menu.box2),
               menuText(178 + 5, 392 - 4, () => text.general.finish)
            ]
         }),
         ...CosmosUtils.populate(54, index => {
            const x = Math.floor(index / 3);
            const y = x < 8 ? x : x - 8;
            switch (index % 3) {
               case 0:
                  return menuSOUL(x < 8 ? 40 : 342, 80 + y * 32, 'sidebarCellBox', x < 8 ? 0 : 1, y);
               case 1:
                  return menuText(
                     x < 8 ? 68 : 370,
                     80 - 4 + y * 32,
                     () => {
                        const container = x < 8 ? SAVE.storage.inventory : SAVE.storage[sidebarrer.dimbox];
                        if (container.size > y) {
                           return CosmosUtils.provide(items.of(container.of(y)!).text.name);
                        } else {
                           return '';
                        }
                     },
                     { fontName: 'DeterminationSans', fontSize: 16 }
                  );
               default:
                  return new CosmosRectangle({
                     alpha: 0,
                     fill: '#f00',
                     position: { x: (x < 8 ? 78 : 380) / 2, y: (90 + y * 32) / 2 },
                     size: { x: 180 / 2, y: 1 / 2 }
                  }).on('tick', function () {
                     this.alpha.value =
                        (x < 8 ? SAVE.storage.inventory : SAVE.storage[sidebarrer.dimbox]).size > y ? 0 : 1;
                  });
            }
         }),
         new CosmosRectangle({ fill: '#fff', position: { x: 320 / 2, y: 92 / 2 }, size: { x: 1 / 2, y: 300 / 2 } }),
         new CosmosRectangle({ fill: '#fff', position: { x: 322 / 2, y: 92 / 2 }, size: { x: 1 / 2, y: 300 / 2 } })
      ]
   })
      .on('from', function () {
         sounds.dimbox.instance(renderer);
         this.position = { x: 0, y: 0 };
      })
      .on('to', () => (game.movement = true)),
   sidebarCellKey: new CosmosNavigator({
      prev: null,
      grid: () => [ [ ...keyring.values() ].filter(entry => entry.display()).map((_, i) => i + 1) ],
      objects: [
         menuBox(16, 16, 598, 438, 6, {
            fontName: 'DeterminationSans',
            fontSize: 16,
            objects: [
               menuText(300, 16 - 4, () => text.menu.key1, { anchor: { x: 0 } }),
               menuText(178 + 5, 392 - 4, () => text.general.finish)
            ]
         }),
         ...CosmosUtils.populate(2 * 3, index => {
            const r = Math.floor(index / 2);
            const y = 100 - 4 + r * 100;
            function idx (r: number) {
               return (
                  [ ...keyring.values() ].filter(entry => entry.display()).length -
                  (atlas.navigators.of('sidebarCellKey').selection() as number) -
                  r
               );
            }
            function info (r: number) {
               return [ ...keyring.values() ]
                  .filter(entry => entry.display())
                  .sort((a, b) => CosmosUtils.provide(b.priority ?? 0) - CosmosUtils.provide(a.priority ?? 0))[idx(r)];
            }
            if (index % 2 === 0) {
               return menuText(
                  68,
                  y,
                  () => {
                     const i = info(r);
                     if (i) {
                        return CosmosUtils.provide(i.name);
                     } else {
                        return '';
                     }
                  },
                  { fontName: 'CryptOfTomorrow', fontSize: 8, fill: '#808080' }
               );
            } else {
               return menuText(
                  68,
                  y + 15,
                  () => CosmosTextUtils.format(CosmosUtils.provide(info(r)?.description ?? ''), 36, true),
                  { fontName: 'DeterminationSans', fontSize: 16, fill: '#fff' }
               );
            }
         }),
         new CosmosObject({ position: { x: 287 }, fill: '#fff' }).on('tick', function () {
            const len = [ ...keyring.values() ].filter(entry => entry.display()).length;
            if (this.metadata.len !== len) {
               this.metadata.len = len;
               const dots = Math.ceil(len / 3);
               if (dots < 2) {
                  this.objects = [];
               } else {
                  const dotSize = 10;
                  const totalHeight = dots * dotSize;
                  const origin = 120 - totalHeight / 2 + dotSize / 2;
                  this.objects = CosmosUtils.populate(dots, index =>
                     new CosmosRectangle({
                        anchor: 0,
                        position: { y: origin + index * dotSize },
                        size: 4
                     }).on('tick', function () {
                        if (index === Math.floor((atlas.navigators.of('sidebarCellKey').selection() - 1) / 3)) {
                           this.alpha.value = 1;
                        } else {
                           this.alpha.value = 0.5;
                        }
                     })
                  );
               }
            }
         })
      ]
   })
      .on('from', () => {
         atlas.navigators.of('sidebarCellKey').position = { x: 0, y: 0 };
         atlas.attach(renderer, 'menu', 'sidebarCellKey');
         sounds.dimbox.instance(renderer);
      })
      .on('to', () => {
         atlas.detach(renderer, 'menu', 'sidebarCellKey');
         game.movement = true;
      })
      .on('change', () => {
         sounds.menu.instance(renderer).rate.value = 1.5;
      })
});

// basic attach/detach
for (const key of [
   'battlerAdvancedTarget',
   'battlerAdvancedAct',
   'battlerAdvancedItem',
   'battlerAdvancedMercy',
   'dialoguerBottom',
   'dialoguerTop',
   'frontEndLoad',
   'frontEndName',
   'frontEndNameConfirm',
   'frontEndSettings',
   'frontEndStart',
   'save',
   'shopText',
   'shopPurchase',
   'sidebarCellBox'
] as string[]) {
   atlas.navigators
      .of(key)
      .on('from', () => atlas.attach(renderer, 'menu', key))
      .on('to', () => atlas.detach(renderer, 'menu', key));
}

// menu navigation sounds
for (const key of [
   'battlerAdvanced',
   'battlerAdvancedTarget',
   'battlerAdvancedAct',
   'battlerAdvancedItem',
   'battlerAdvancedMercy',
   'choicer',
   'save',
   'shop',
   'shopList',
   'sidebar',
   'sidebarItem',
   'sidebarItemOption',
   'sidebarCell'
]) {
   atlas.navigators.of(key).on('change', () => sounds.menu.instance(renderer));
}

// positional reset on navigate from, select on navigate to
for (const [ nav1, nav2, ...others ] of [
   [ 'battlerAdvancedAct', 'battlerAdvancedTarget' ],
   [ 'battlerAdvancedItem', 'battlerAdvanced' ],
   [ 'battlerAdvancedMercy', 'battlerAdvanced' ],
   [ 'shop', null ],
   [ 'shopList', 'shop' ],
   [ 'sidebar', null, 'frontEndSettings' ],
   [ 'sidebarItem', 'sidebar' ],
   [ 'sidebarCell', 'sidebar', 'sidebarCellBox', 'sidebarCellPms', 'sidebarCellKey', 'frontEndSettings' ]
] as [string, string | null, ...string[]][]) {
   atlas.navigators.of(nav1).on('from', from => {
      from === nav2 && (atlas.navigators.of(nav1).position = { x: 0, y: 0 });
   });
   atlas.navigators.of(nav1).on('to', to => {
      [ nav2, ...others ].includes(to!) || sounds.select.instance(renderer);
   });
}

// ghostface fix
for (const key of [ 'dialoguerBottom', 'dialoguerTop', 'battlerAdvancedText' ]) {
   const nav = atlas.navigators.of(key);
   speech.holders.push(() => {
      (key === 'battlerAdvancedText' ? nav.objects[1] : nav.objects[0].objects[2].objects[0]).objects = [
         ...(speech.state.face ? [ speech.state.face ] : [])
      ];
   });
}

events.on('choice', async choice => {
   if (battler.groups.length !== 0) {
      let target = 0;
      let select = false;
      if (battler.targetOverride !== null) {
         target = battler.targetOverride;
         select = true;
         battler.targetOverride = null;
      }
      if (!select && ![ 'spare', 'item', 'flee', 'assist' ].includes(choice.type)) {
         const selection = atlas.navigators.of('battlerAdvancedTarget').selection() as number;
         if (typeof selection === 'number') {
            target = selection;
            select = true;
         }
      }
      if (!select) {
         for (const [ index, { alive } ] of battler.volatile.entries()) {
            if (alive) {
               target = index;
               break;
            }
         }
      }
      const volatile = battler.volatile[target];
      await volatile.opponent.handler?.(choice, target, volatile);
      for (const group of battler.groups) {
         group.handler?.(choice, target, volatile);
      }
   }
});

events.on('escape', () => {
   battler.regen.reset();
   battler.hpboost.reset();
});

events.on('exit', () => {
   battler.regen.reset();
   battler.hpboost.reset();
});

events.on('victory', () => {
   battler.regen.reset();
   battler.hpboost.reset();
});

events.on('resume', () => {
   battler.regen.reset();
   const dm = battler.hpboost.calculateDM();
   battler.hpboost.calculateHP(dm) - SAVE.data.n.hp > 0 && heal(dm, true, true);
   battler.hpboost.reset();
});

events.on('modded').then(() => {
   SAVE.flag.s.$gamepad_input_f === '' || frontEnder.updateDeadzone();
   isMobile.any && frontEnder.updateRight();
});

events.on('loaded').then(() => {
   frontEnder.updateEpilepsy();
   frontEnder.updateFancy();
   frontEnder.updateMusic();
   frontEnder.updateSFX();
   if (isMobile.any) {
      renderer.attach('menu', mobile.gamepad());
      mobile.target = renderer.canvas;
   }
});

events.on('teleport-update', (direction, position) => {
   player.position.set(position);
   player.face = direction;
   player.metadata.x = player.position.x;
   player.metadata.y = player.position.y;
   player.metadata.face = player.face;
   for (const entry of tracker.history) {
      entry[0] = direction;
      entry[1].x = position.x;
      entry[1].y = position.y;
   }
});

keys.downKey.on('down', () => {
   if (keys.altKey.active()) {
      return;
   }
   keyState.down = true;
   if (
      game.input &&
      battler.active &&
      game.movement &&
      battler.SOUL.metadata.color === 'purple' &&
      battler.line.swap === 0 &&
      (battler.line.loop > 0 || battler.line.pos.y <= battler.box.size.y - 24)
   ) {
      battler.line.swap = 1;
      battler.line.swap_invuln = true;
   }
});

keys.interactKey.on('down', () => {
   keyState.interact = true;
   if (!game.input || !game.movement) {
      return;
   }
   if (battler.active) {
      if (battler.SOUL.alpha.value > 0 && battler.activate_ability()) {
         return;
      }
   } else if (!game.noclip && game.interact) {
      game.interact = false;
      activate(player.objects[1] as CosmosHitbox, hitbox => !!(hitbox.metadata.interact && hitbox.metadata.name));
      renderer.on('render').then(() => {
         game.interact = true;
      });
      return;
   }
   atlas.target === 'dialoguerBase' && atlas.next();
});

keys.leftKey.on('down', () => {
   if (keys.altKey.active()) {
      return;
   }
   keyState.left = true;
   if (atlas.target === 'frontEndSettings') {
      const selection = atlas.navigators.of('frontEndSettings').selection() as string;
      if (selection === 'music' && !SAVE.flag.b.$option_music) {
         SAVE.flag.n.$option_music = Math.min(Math.max(0, (SAVE.flag.n.$option_music += 0.05)), 1);
         frontEnder.testMusic();
      } else if (selection === 'sfx' && !SAVE.flag.b.$option_sfx) {
         SAVE.flag.n.$option_sfx = Math.min(Math.max(0, (SAVE.flag.n.$option_sfx += 0.05)), 1);
         frontEnder.testSFX();
      } else if (selection === 'deadzone') {
         SAVE.flag.n.$option_deadzone = Math.min(Math.max(0.1, (SAVE.flag.n.$option_deadzone -= 0.05)), 0.9);
      }
   }
});

keys.menuKey.on('down', async () => {
   keyState.menu = true;
   if (game.input) {
      if (battler.active) {
         switch (atlas.target) {
            case 'frontEndSettings':
               atlas.prev();
               break;
            case 'battlerAdvanced':
               battler.SOUL.alpha.value === 1 && sidebarrer.openSettings();
               break;
         }
      } else if (game.menu) {
         switch (atlas.target) {
            case 'sidebar':
               atlas.prev();
               break;
            case null:
               if (game.movement) {
                  game.movement = false;
                  atlas.switch('sidebar');
               }
               break;
         }
      }
   }
});

keys.quitKey.on('down', async () => {
   let active = true;
   const r = escText.metadata.renderer;
   r.attach('menu', escText);
   keys.quitKey.on('up').then(() => {
      active = false;
      escText.metadata.state = 0;
      escText.alpha.modulate(r, escText.alpha.value * 300, 0).then(() => {
         r.detach('menu', escText);
      });
   });
   await escText.alpha.modulate(r, 300, 1);
   while (active && escText.metadata.state++ !== 2) {
      await r.pause(300);
   }
   active && (backend === null || SAVE.ready ? reload_full() : exit());
});

keys.rightKey.on('down', () => {
   if (keys.altKey.active()) {
      return;
   }
   keyState.right = true;
   if (atlas.target === 'frontEndSettings') {
      const selection = atlas.navigators.of('frontEndSettings').selection() as string;
      if (selection === 'music' && !SAVE.flag.b.$option_music) {
         SAVE.flag.n.$option_music = Math.min(Math.max(0, (SAVE.flag.n.$option_music -= 0.05)), 1);
         frontEnder.testMusic();
      } else if (selection === 'sfx' && !SAVE.flag.b.$option_sfx) {
         SAVE.flag.n.$option_sfx = Math.min(Math.max(0, (SAVE.flag.n.$option_sfx -= 0.05)), 1);
         frontEnder.testSFX();
      } else if (selection === 'deadzone') {
         SAVE.flag.n.$option_deadzone = Math.min(Math.max(0.1, (SAVE.flag.n.$option_deadzone += 0.05)), 0.9);
      }
   }
});

keys.specialKey.on('down', () => {
   keyState.special = true;
   if (atlas.target === 'dialoguerBase' && game.movement) {
      atlas.prev();
   }
});

keys.upKey.on('down', () => {
   if (keys.altKey.active()) {
      return;
   }
   keyState.up = true;
   if (
      game.input &&
      battler.active &&
      game.movement &&
      battler.SOUL.metadata.color === 'purple' &&
      battler.line.swap === 0 &&
      (battler.line.loop < 0 || 24 <= battler.line.pos.y)
   ) {
      battler.line.swap = -1;
      battler.line.swap_invuln = true;
   }
});

renderer.on('tick', { priority: -Infinity, listener: gamepadder.update });

renderer.on('tick', () => {
   game.timer && SAVE.data.n.time++;

   if (battler.active) {
      battler.SOUL.metadata.ticked = false;
   }

   if (battler.regen.time > 0) {
      let h = false;
      while (battler.regen.time <= ++battler.regen.value) {
         battler.regen.value -= battler.regen.time;
         heal(1, false);
         battler.hpboost.magic -= 1;
         if (!h) {
            h = true;
            atlas.navigators.of('battlerAdvanced').objects[3].objects[1].objects[2].metadata.sparkleshadow = true;
         }
      }
   }

   if (keyState.menu && game.interact && game.input && (!game.movement || battler.active)) {
      if (game.movement && battler.SOUL.alpha.value > 0 && battler.activate_ability()) {
         return;
      }
      switch (atlas.target) {
         case 'dialoguerBase':
            typer.read();
            typer.skip(false, true);
            for (const typer_local of battler.multitext.typers) {
               typer_local.read();
               typer_local.skip(false, true);
            }
            break;
         case 'dialoguerBottom':
         case 'dialoguerTop':
         case 'shopText':
         case 'battlerSimple':
         case 'battlerAdvancedText':
            typer.read();
            typer.skip(false, true);
            break;
      }
   }

   if (!player.puppet) {
      if (game.input && !battler.active && game.movement) {
         const up = keyState.up;
         const left = keyState.left;
         const right = keyState.right;
         const down = keyState.down;
         const base = player.position.value();
         const mSpeed = (game.sprint && keyState.special ? 3 : 1) * player.metadata.speed;
         player.move(
            new CosmosPoint(
               left ? -3 : right ? 3 : 0,
               player.metadata.reverse ? (down ? 3 : up ? -3 : 0) : up ? -3 : down ? 3 : 0
            ).multiply(mSpeed),
            renderer,
            [ 'below', 'main' ],
            game.noclip ? false : hitbox => hitbox.metadata.barrier === true
         );
         if (player.metadata.reverse) {
            if (down) {
               player.face = 'up';
               mSpeed === 0 || player.sprite.enable();
            } else if (up) {
               player.face = 'down';
               mSpeed === 0 || player.sprite.enable();
            } else if (left) {
               player.face = 'right';
               mSpeed === 0 || player.sprite.enable();
            } else if (right) {
               player.face = 'left';
               mSpeed === 0 || player.sprite.enable();
            }
         }
         if (mSpeed === 0) {
            if (up) {
               player.face = player.metadata.reverse ? 'down' : 'up';
            } else if (down) {
               player.face = player.metadata.reverse ? 'up' : 'down';
            } else if (left) {
               player.face = player.metadata.reverse ? 'right' : 'left';
            } else if (right) {
               player.face = player.metadata.reverse ? 'left' : 'right';
            }
         } else if (up && down && player.position.y === base.y) {
            if (player.metadata.reverse) {
               player.position.y -= 1;
            } else {
               player.position.y += 1;
            }
            player.face = 'down';
         }
         if (!game.noclip) {
            let tick = true;
            if (player.position.x !== base.x || player.position.y !== base.y) {
               SAVE.data.n.steps++;
               if (events.fire('step').includes(true)) {
                  tick = false;
               }
            }
            if (tick) {
               activate(player, hitbox => !!(hitbox.metadata.trigger && hitbox.metadata.name));
               events.fire('tick');
            }
         }
      } else {
         player.move({ x: 0, y: 0 }, renderer);
      }
   }
});

typer.on('empty', () => {
   for (const instance of fetchCharacters()) {
      instance.talk = false;
      for (const sprite of Object.values(instance.preset.talk)) {
         speech.targets.delete(sprite);
      }
   }
});

typer.on('header', header => {
   const [ key, delimiter, ...args ] = header.split('');
   if (delimiter === '/') {
      const value = args.join('');
      switch (key) {
         case 'c':
            const [ type, mA, mB ] = value.split('/').map(subvalue => +subvalue);
            choicer.marginA = mA;
            choicer.marginB = mB;
            choicer.navigator = atlas.target;
            choicer.result = 0;
            choicer.type = type;
            atlas.target = 'choicer';
            atlas.attach(renderer, 'menu', 'choicer');
            atlas.navigators.of('choicer').position = { x: 0, y: 0 };
            break;
         case 'e':
            const [ identifier, emote ] = value.split('/');
            identifier in speech.emoters && (speech.emoters[identifier].index = +emote);
            break;
         case 'f':
            speech.state.face = speech.state.preset.faces[+value];
            speech.state.face?.reset();
            break;
         case 'g':
            speech.state.face = portraits.of(value);
            speech.state.face?.reset();
            break;
         case 'i':
            if (value[0] === 'x') {
               typer.interval = Math.round(speech.state.preset.interval * +value.slice(1));
            } else {
               typer.interval = +value;
            }
            break;
         case 'k':
            shopper.value!.preset(...value.split('/').map(subvalue => +subvalue));
            break;
         case 'p':
            const preset = (speech.state.preset = speech.presets.of(value));
            speech.state.face = preset.faces[0];
            speech.state.face?.reset();
            typer.chunksize = preset.chunksize ?? 1;
            typer.interval = preset.interval;
            typer.threshold = preset.threshold ?? 0;
            typer.sounds = preset.voices[0] ?? [];
            game.text = '';
            for (const instance of fetchCharacters()) {
               if (instance.key === value) {
                  instance.talk = true;
                  for (const sprite of Object.values(instance.preset.talk)) {
                     speech.targets.add(sprite);
                  }
               } else {
                  instance.talk = false;
                  for (const sprite of Object.values(instance.preset.talk)) {
                     speech.targets.delete(sprite);
                  }
               }
            }
            break;
         case 's':
            soundRegistry.of(value).instance(renderer);
            break;
         case 'v':
            typer.sounds = speech.state.preset.voices[+value] ?? [];
            break;
      }
   }
});

typer.on('idle', () => {
   speech.state.face?.reset();
   for (const speaker of speech.targets) {
      speaker.reset();
   }
   events.fire('shut');
});

typer.on('text', content => {
   game.text = content;
   if (typer.mode === 'read' && content.length > 0) {
      if (content[content.length - 1].match(/[\.\!\?]/)) {
         speech.state.face?.reset();
         for (const speaker of speech.targets) {
            speaker.reset();
         }
         events.fire('shut');
      } else {
         speech.state.face?.enable();
         for (const speaker of speech.targets) {
            speaker.enable();
         }
         events.fire('talk');
      }
   }
});

addEventListener('blur', () => {
   gamepadder.reset();
   mobile.reset();
   if (!game.focus) {
      context.suspend();
      CosmosRenderer.suspend = true;
   }
   for (const key of Object.values(keys)) {
      key.reset();
   }
});

addEventListener('focus', () => {
   if (!game.focus) {
      context.resume();
      CosmosRenderer.suspend = false;
   }
});

addEventListener('gamepadconnected', event => {
   gamepadder.connect(event.gamepad);
});

addEventListener('gamepaddisconnected', event => {
   gamepadder.disconnect(event.gamepad);
});

if (isMobile.any) {
   addEventListener('touchcancel', event => {
      event.preventDefault();
      for (const touch of mobile.touches(event)) {
         mobile.clear(touch.identifier);
      }
   });

   addEventListener('touchend', event => {
      event.preventDefault();
      for (const touch of mobile.touches(event)) {
         mobile.clear(touch.identifier);
      }
   });

   addEventListener('touchmove', event => {
      event.preventDefault();
      mobile.target && (mobile.bounds = mobile.target.getBoundingClientRect());
      for (const touch of mobile.touches(event)) {
         mobile.touch(
            touch.identifier,
            new CosmosPoint(touch.clientX, touch.clientY)
               .subtract(mobile.bounds)
               .divide(game.ratio)
               .divide(renderer.scale)
         );
      }
   });

   addEventListener('touchstart', event => {
      event.preventDefault();
      mobile.target && (mobile.bounds = mobile.target.getBoundingClientRect());
      for (const touch of mobile.touches(event)) {
         mobile.clear(touch.identifier);
         mobile.touch(
            touch.identifier,
            new CosmosPoint(touch.clientX, touch.clientY)
               .subtract(mobile.bounds)
               .divide(game.ratio)
               .divide(renderer.scale)
         );
      }
   });
}

CosmosUtils.status(`LOAD MODULE: FRAMEWORK (${Math.floor(performance.now()) / 1000})`, { color: '#07f' });
