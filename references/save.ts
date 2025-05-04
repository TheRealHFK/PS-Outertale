import { backend, dialog, params } from './core';
import { OutertaleInventory } from './outertale';
import { CosmosKeyed, CosmosUtils } from './storyteller';
import text from './text';
import { native } from './translator';

// SAVE data booleans
export type OutertaleDataBooleanBase = typeof dataBoolean;
export interface OutertaleDataBoolean extends OutertaleDataBooleanBase {}

// SAVE flag booleans
export type OutertaleFlagBooleanBase = typeof flagBoolean;
export interface OutertaleFlagBoolean extends OutertaleFlagBooleanBase {}

// SAVE data numbers
export type OutertaleDataNumberBase = typeof dataNumber;
export interface OutertaleDataNumber extends OutertaleDataNumberBase {}

// SAVE flag numbers
export type OutertaleFlagNumberBase = typeof flagNumber;
export interface OutertaleFlagNumber extends OutertaleFlagNumberBase {}

// SAVE data strings
export type OutertaleDataStringBase = typeof dataString;
export interface OutertaleDataString extends OutertaleDataStringBase {}

// SAVE flag strings
export type OutertaleFlagStringBase = typeof flagString;
export interface OutertaleFlagString extends OutertaleFlagStringBase {}

export async function reportError (...identifier: string[]) {
   console.trace(new Error(text.dialog.error_access.replace('$(x)', identifier.join(':'))));
   backend?.exec('devtools', true);
   dialog.message(true, 'alert', {
      buttons: text.dialog.message_alert,
      message: `${text.dialog.error_access.replace('$(x)', identifier.join(':'))}`,
      title: text.dialog.dialog_error_title
   });
}

export function createDataStore<A extends object> (prefix: string, fallback: any, entries: any): A {
   return new Proxy(entries, {
      get (target, key) {
         if (typeof key === 'string') {
            if (!SAVE.ready) {
               reportError('data', prefix, key);
               return fallback;
            }
            return SAVE.state[prefix]?.[key] ?? entries[key] ?? fallback;
         }
      },
      set (target, key, value) {
         if (typeof key === 'string') {
            if (!SAVE.ready) {
               reportError('data', prefix, key);
               return fallback;
            }
            (SAVE.state[prefix] ??= {})[key] = value;
            return true;
         } else {
            return false;
         }
      },
      deleteProperty (target, key) {
         if (typeof key === 'string') {
            if (!SAVE.ready) {
               reportError('data', prefix, key);
               return fallback;
            }
            delete SAVE.state[prefix]?.[key];
            return true;
         } else {
            return false;
         }
      }
   }) as A;
}

export function createFlagStore<A extends object> (prefix: string, fallback: any, entries: any): A {
   return new Proxy(entries, {
      get (target, key) {
         if (typeof key === 'string') {
            if (!SAVE.ready && key[0] !== '$') {
               reportError('flag', prefix, key);
               return fallback;
            }
            const name = `${key[0] === '$' ? SAVE.safespace : SAVE.namespace}:${prefix}:${key}`;
            if (key[0] === '_' && name in SAVE.hostages) {
               return SAVE.hostages[name] ?? entries[key] ?? fallback;
            } else {
               return CosmosUtils.parse(SAVE.manager.getItem(name), entries[key] ?? fallback);
            }
         }
      },
      set (target, key, value) {
         if (typeof key === 'string') {
            if (!SAVE.ready && key[0] !== '$') {
               reportError('flag', prefix, key);
               return fallback;
            }
            const name = `${key[0] === '$' ? SAVE.safespace : SAVE.namespace}:${prefix}:${key}`;
            if (key[0] === '_' && name in SAVE.hostages) {
               SAVE.hostages[name] = value;
            } else {
               SAVE.manager.setItem(name, CosmosUtils.serialize(value));
            }
            return true;
         } else {
            return false;
         }
      },
      deleteProperty (target, key) {
         if (typeof key === 'string') {
            if (!SAVE.ready && key[0] !== '$') {
               reportError('flag', prefix, key);
               return fallback;
            }
            const name = `${key[0] === '$' ? SAVE.safespace : SAVE.namespace}:${prefix}:${key}`;
            if (key[0] === '_' && name in SAVE.hostages) {
               SAVE.hostages[name] = null;
            } else {
               SAVE.manager.removeItem(name);
            }
            return true;
         } else {
            return false;
         }
      }
   }) as A;
}

export function info<A> (defaultValue = null as A): A {
   return defaultValue;
}

export const dataBoolean = {
   /** broke mett's arms */
   a_state_armwrecker: info<boolean>(),

   /** backtracked to other side of CORE with azzy */
   a_state_asrielTimewaster: info<boolean>(),

   /** waited full duration in geno mtt show */
   a_state_awaiter: info<boolean>(),

   /** backtrack before hitting button */
   a_state_backtracker: info<boolean>(),

   /** purchased dimensional bedroom */
   a_state_bedroom: info<boolean>(),

   /** on the line with alphys */
   a_state_corecall: info<boolean>(),

   /** papyrus explained why undyne is missing */
   a_state_fishbetray: info<boolean>(),

   /** switched sides */
   a_state_flipflopper: info<boolean>(),

   /** got burgie's one-of-a-kind-totally-not-gonna-kill-you-if-you-eat-it foodster! */
   a_state_freesell: info<boolean>(),

   /** got the new cellphone */
   a_state_gotphone: info<boolean>(),

   /** mettaton's secret will be revealed */
   a_state_hapstablook: info<boolean>(),

   /** hotelfood was offered but not taken yet */
   a_state_hotelfood: info<boolean>(),

   /** broke mett's legs */
   a_state_legwrecker: info<boolean>(),

   /** got told about mew mew doll */
   a_state_m3: info<boolean>(),

   /** eligible for first item in 3rd MTT show */
   a_state_moneyitemA: info<boolean>(),

   /** eligible for 2nd item in 3rd MTT show */
   a_state_moneyitemB: info<boolean>(),

   /** eligible for final item in 3rd MTT show */
   a_state_moneyitemC: info<boolean>(),

   /** undyne appeared at the game show instead of sans */
   a_state_moneyfish: info<boolean>(),

   /** declined to napstablook's game show plea in */
   a_state_napstadecline: info<boolean>(),

   /** got pm about electrospear */
   a_state_pm_electrospear: info<boolean>(),

   /** puzzle help notifier call */
   a_state_puzzlehelp: info<boolean>(),

   /** slept in sans's bed. :poop: */
   amogus: info<boolean>(),

   /** armageddon will play on reload! */
   armaloop: info<boolean>(),

   /** assist used for knightknight */
   assist_knightknight: info<boolean>(),

   /** assist used for madjick */
   assist_madjick: info<boolean>(),

   /** badness increased to one */
   bad_lizard: info<boolean>(),

   // monster bullied states
   bullied_chilldrake: info<boolean>(),
   bullied_dogamy: info<boolean>(),
   bullied_dogaressa: info<boolean>(),
   bullied_doggo: info<boolean>(),
   bullied_froggit: info<boolean>(),
   bullied_froggitex: info<boolean>(),
   bullied_lesserdog: info<boolean>(),
   bullied_migosp: info<boolean>(),
   bullied_moldbygg: info<boolean>(),
   bullied_moldsmal: info<boolean>(),
   bullied_mouse: info<boolean>(),
   bullied_mushketeer: info<boolean>(),
   bullied_mushy: info<boolean>(),

   /** bullied papyrus */
   bullied_papyrus: info<boolean>(),
   bullied_perigee: info<boolean>(),
   bullied_pyrope: info<boolean>(),
   bullied_radtile: info<boolean>(),
   bullied_rg03: info<boolean>(),
   bullied_rg04: info<boolean>(),

   /** bullied shyren */
   bullied_shyren: info<boolean>(),
   bullied_spacetop: info<boolean>(),
   bullied_stardrake: info<boolean>(),
   bullied_tsundere: info<boolean>(),
   bullied_whimsalot: info<boolean>(),
   bullied_whimsun: info<boolean>(),
   bullied_woshua: info<boolean>(),

   /** toriel's secret */
   c_state_secret1: info<boolean>(),

   /** used toriel's secret */
   c_state_secret1_used: info<boolean>(),

   /** gerson's secret */
   c_state_secret2: info<boolean>(),

   /** used gerson's secret */
   c_state_secret2_used: info<boolean>(),

   /** roman's secret */
   c_state_secret3: info<boolean>(),

   /** used roman's secret */
   c_state_secret3_used: info<boolean>(),

   /** napstablook's secret */
   c_state_secret4: info<boolean>(),

   /** used napstablook's secret */
   c_state_secret4_used: info<boolean>(),

   /** asgore's secret */
   c_state_secret5: info<boolean>(),

   /** used asgore's secret */
   c_state_secret5_used: info<boolean>(),

   /** roadswitch 1 */
   c_state_switch1: info<boolean>(),

   /** roadswitch 2 */
   c_state_switch2: info<boolean>(),

   /** true if "About Yourself" has been used on the CELL */
   cell_about: info<boolean>(),

   /** remove about yourself option from CELL */
   cell_about_end: info<boolean>(),

   /** true if "About Yourself" has been used on Asgore's CELL */
   cell_about_asgore: info<boolean>(),

   /** remove about yourself on the CELL */
   cell_about_asgore_end: info<boolean>(),

   /** true if "Call Him Dad" has been used on Asgore's CELL */
   cell_dad: info<boolean>(),

   /** remove dad from asgore's cell */
   cell_dad_end: info<boolean>(),

   /** true if "Flirt" has been used on the CELL */
   cell_flirt: info<boolean>(),

   /** remove flirt option from CELL */
   cell_flirt_end: info<boolean>(),

   /** true if "Flirt" has been used on Asgore's CELL */
   cell_flirt_asgore: info<boolean>(),

   /** remove flirt from asgore's cell */
   cell_flirt_asgore_end: info<boolean>(),

   /** true if "Call Her Mom" has been used on the CELL */
   cell_mom: info<boolean>(),

   /** remove mom option from CELL */
   cell_mom_end: info<boolean>(),

   /** true if "Puzzle Help" has been used on the CELL */
   cell_puzzle: info<boolean>(),

   /** true if "Puzzle Help" has been used on the CELL with alphys */
   cell_puzzle_alphys: info<boolean>(),

   /** true if sock drawer was messed with */
   cetadel: info<boolean>(),

   /** true if computer chip was inserted into the computer */
   chip: info<boolean>(),

   /** "the choice" will play on reload */
   choiceloop: info<boolean>(),

   /** paid for temmie college */
   colleg: info<boolean>(),

   /** dropped snack in front of undyne! */
   drop_snack: info<boolean>(),

   /** dropped fried snails in front of toriel. */
   drop_snails: info<boolean>(),

   /** failed to go through with apology */
   f_state_blookbetray: info<boolean>(),

   /** napstablook reacted to spooktune */
   f_state_blookmusic1: info<boolean>(),

   /** party reacted to spooktune */
   f_state_blookmusic1x: info<boolean>(),

   /** napstablook reacted to spookwave */
   f_state_blookmusic2: info<boolean>(),

   /** party reacted to spookwave */
   f_state_blookmusic2x: info<boolean>(),

   /** napstablook reacted to spookwaltz */
   f_state_blookmusic3: info<boolean>(),

   /** party reacted to spookwaltz */
   f_state_blookmusic3x: info<boolean>(),

   // monster kid signal star reaction flags
   f_state_dc_kidd2: info<boolean>(),
   f_state_dc_kidd3: info<boolean>(),
   f_state_dc_kidd4: info<boolean>(),
   f_state_dc_kidd5: info<boolean>(),
   f_state_dc_kidd8: info<boolean>(),
   f_state_dc_kidd9: info<boolean>(),
   f_state_dc_kidd10: info<boolean>(),

   /** completed dialogue tree of npc 86 */
   f_state_done86: info<boolean>(),

   /** put a sock in it */
   f_state_dummypunch: info<boolean>(),

   /** put a sock in it (u were meanie) */
   f_state_dummypunch_meanie: info<boolean>(),

   /** put an eye on it */
   f_state_dummytalk: info<boolean>(),

   /** exit date */
   f_state_exitdate: info<boolean>(),

   /** tried to hug napstablook */
   f_state_ghosthug: info<boolean>(),

   /** asked napstablook to sleep over */
   f_state_ghostsleep: info<boolean>(),

   /** unlocked hapstablook's house with the mystery key */
   f_state_hapstadoor: info<boolean>(),

   /** true if monster kid acted in battle */
   f_state_kidd_act: info<boolean>(),

   /** true if player didn't save MK */
   f_state_kidd_betray: info<boolean>(),

   /** true if player waited for MK to fail */
   f_state_kidd_betray_wait: info<boolean>(),

   /** true if monster kid mentioned the gap */
   f_state_kidd_bird: info<boolean>(),

   /** true if monster kid got nice cream! */
   f_state_kidd_cream: info<boolean>(),

   /** true if monster kid attacked a monster */
   f_state_kidd_fight: info<boolean>(),

   /** true if monster kid used magic in battle */
   f_state_kidd_magic: info<boolean>(),

   /** true if monster kid tried mercy in battle */
   f_state_kidd_mercy: info<boolean>(),

   /** napsta comment */
   f_state_kidd_napstacom: info<boolean>(),

   /** true if monster kid reacted to nobody encounter */
   f_state_kidd_nobody: info<boolean>(),

   /** true if monster kid complained about dark area */
   f_state_kidd_prechase: info<boolean>(),

   /** snail comment */
   f_state_kidd_snailcom: info<boolean>(),

   /** true if monster kid explained statue mechanic */
   f_state_kidd_statue: info<boolean>(),

   /** temmie comment */
   f_state_kidd_temmiecom: info<boolean>(),

   /** trash comment */
   f_state_kidd_trashcom: info<boolean>(),

   /** trauma dialogue for encounter */
   f_state_kidd_trauma: info<boolean>(),

   /** undyne comment */
   f_state_kidd_undynecom: info<boolean>(),

   /** mushroom dance, mushroom dance, whatever could it mean */
   f_state_mushroomdance: info<boolean>(),

   /** woahhhh suddenly epilogue!!! */
   f_state_mushroomdanceEpilogue: info<boolean>(),

   /** it means youve lived a life of sin */
   f_state_mushroomdanceGeno: info<boolean>(),

   /** true if narrator said nobody came for other side of bird */
   f_state_narrator_bird: info<boolean>(),

   /** interacted with nice cream guy in foundry */
   f_state_nicecream: info<boolean>(),

   /** you got a nice cream in foundry */
   f_state_nicecream_purchase: info<boolean>(),

   /** nice cream guy reminded you of punch cards */
   f_state_noticard: info<boolean>(),

   /** got puzzle password from clamgirl NPC */
   f_state_password: info<boolean>(),

   /** you told pap what your wearing */
   f_state_papclothes: info<boolean>(),

   /** unlocked the piano puzzle */
   f_state_piano: info<boolean>(),

   /** used the puzzle password from clamgirl NPC */
   f_state_quicksolve: info<boolean>(),

   /** tried sans's "telescope" (big mistake) */
   f_state_telescope: info<boolean>(),

   /** triggered the hidden switch on the tem statue */
   f_state_temstatue: info<boolean>(),

   /** won a game of thundersnail */
   f_state_thundersnail_win: info<boolean>(),

   /** unlocked the hidden secondary piano puzzle */
   f_state_truth: info<boolean>(),

   /** threatened undyne with epiphany */
   f_state_undynethreat: info<boolean>(),

   /** chara mini monologue at citadel view */
   f_state_viewchat: info<boolean>(),

   /** used sans's subscription voucher */
   f_state_voucher: info<boolean>(),

   /** got voted out in MTT show */
   failshow: info<boolean>(),

   // monster flirt states
   flirt_alphys: info<boolean>(),
   flirt_asriel: info<boolean>(),
   flirt_astigmatism: info<boolean>(),
   flirt_burgie: info<boolean>(),
   flirt_chilldrake: info<boolean>(),
   flirt_dogamy: info<boolean>(),
   flirt_dogaressa: info<boolean>(),
   flirt_doge: info<boolean>(),
   flirt_doggo: info<boolean>(),
   flirt_froggit: info<boolean>(),
   flirt_froggitex: info<boolean>(),
   flirt_glyde: info<boolean>(),
   flirt_greatdog: info<boolean>(),
   flirt_knightknight: info<boolean>(),
   flirt_lesserdog: info<boolean>(),
   flirt_loox: info<boolean>(),
   flirt_maddummy: info<boolean>(),
   flirt_madjick: info<boolean>(),
   flirt_mettaton: info<boolean>(),
   flirt_migosp: info<boolean>(),
   flirt_migospel: info<boolean>(),
   flirt_moldbygg: info<boolean>(),
   flirt_moldsmal: info<boolean>(),
   flirt_mouse: info<boolean>(),
   flirt_muffet: info<boolean>(),
   flirt_mushketeer: info<boolean>(),
   flirt_mushy: info<boolean>(),
   flirt_papyrus: info<boolean>(),
   flirt_perigee: info<boolean>(),
   flirt_pyrope: info<boolean>(),
   flirt_radtile: info<boolean>(),
   flirt_rg03: info<boolean>(),
   flirt_rg04: info<boolean>(),
   flirt_shyren: info<boolean>(),
   flirt_spacetop: info<boolean>(),
   flirt_stardrake: info<boolean>(),
   flirt_tsundere: info<boolean>(),
   flirt_undyne: info<boolean>(),
   flirt_whimsalot: info<boolean>(),
   flirt_whimsun: info<boolean>(),
   flirt_woshua: info<boolean>(),

   /** went to new planet yay */
   freedom: info<boolean>(),

   /** chose fries */
   fryz: info<boolean>(),

   /** genocide route */
   genocide: info<boolean>(),

   /** heard narrator rant */
   heard_narrator: info<boolean>(),

   /** got sans's second key,,,,,,,,,,,,,,,,,,,,,,,, */
   inverter_key: info<boolean>(),

   /** got the LEGENDARY ARTIFACT */
   item_artifact: info<boolean>(),

   /** got the big dipper */
   item_big_dipper: info<boolean>(),

   /** got napstablook's homemade pie */
   item_blookpie: info<boolean>(),

   /** got the hoverboots */
   item_boots: info<boolean>(),

   /** got the chocolate */
   item_chocolate: info<boolean>(),

   /** got the electrospear */
   item_electrospear: info<boolean>(),

   /** got the augmented eye */
   item_eye: info<boolean>(),

   /** got that face steak! */
   item_face_steak: info<boolean>(),

   /** got food from grillby's */
   item_fast_food: info<boolean>(),

   /** got the AR goggles */
   item_goggles: info<boolean>(),

   /** got the halo */
   item_halo: info<boolean>(),

   /** got the heart locket */
   item_heart_locket: info<boolean>(),

   /** got the flight suit */
   item_jumpsuit: info<boolean>(),

   /** got the arc laser */
   item_laser: info<boolean>(),

   /** got the little dipper */
   item_little_dipper: info<boolean>(),

   /** got the moon pie */
   item_moonpie: info<boolean>(),

   /** got the mystery key */
   item_mystery_key: info<boolean>(),

   /** got the orange soda */
   item_orange_soda: info<boolean>(),

   /** got the datapad */
   item_padd: info<boolean>(),

   /** got the cheesecake */
   item_quiche: info<boolean>(),

   /** got the sonic repulsor */
   item_sonic: info<boolean>(),

   /** got the starling tea */
   item_starling_tea: info<boolean>(),

   /** got the tablaphone */
   item_tablaphone: info<boolean>(),

   /** got the temy armor */
   item_temyarmor: info<boolean>(),

   /** got time versus money 2nd show item (fireworks) */
   item_tvm_fireworks: info<boolean>(),

   /** got time versus money final show item (mewmew) */
   item_tvm_mewmew: info<boolean>(),

   /** got time versus money first show item (radio) */
   item_tvm_radio: info<boolean>(),

   /** got tac visor */
   item_visor: info<boolean>(),

   /** got the void key */
   item_voidy: info<boolean>(),

   /** true if coffin key was taken */
   key_coffin: info<boolean>(),

   /** killed glyde */
   killed_glyde: info<boolean>(),

   /** killed knight knight */
   killed_knightknight: info<boolean>(),

   /** killed madjick */
   killed_madjick: info<boolean>(),

   /** killed shyren */
   killed_shyren: info<boolean>(),

   /** papyrus phone call */
   kitchencall: info<boolean>(),

   /** legendary item used for knightknight */
   legendary_knightknight: info<boolean>(),

   /** legendary item used for madjick */
   legendary_madjick: info<boolean>(),

   /** killed or bullied migospel */
   migonespel: info<boolean>(),

   /** whether or not napstablook has been called about performing */
   napsta_performance: info<boolean>(),

   /** no kill on mushketeer */
   nk_mushketeer: info<boolean>(),

   /** it's onionsan! onionsan, y'hear! */
   onionsan: info<boolean>(),

   /** oops */
   oops: info<boolean>(),

   /** failed on papyrus's firewall */
   papyrus_fire: info<boolean>(),

   /** do you have redeeming qualities? */
   papyrus_quality: info<boolean>(),

   /** spared papyrus!?!?!?!?!??!?!?!!!?!?!?!/!/1/1/!?1/1/1/!?!?!?1//!/!/1/1/11//1/1?!?1/1?!?/1/1/1/!/1/1/?!/1/1/1/? */
   papyrus_secret: info<boolean>(),

   /** papyrus special attack */
   papyrus_specatk: info<boolean>(),

   /** first jukebox track was played */
   s_state_barmusic1: info<boolean>(),

   /** first jukebox track was played */
   s_state_barmusic2: info<boolean>(),

   /** first jukebox track was played */
   s_state_barmusic3: info<boolean>(),

   /** true if the capstation key was taken */
   s_state_capstation: info<boolean>(),

   /** narrator read you the book */
   s_state_chareader: info<boolean>(),

   /** narrator talked about the telescope */
   s_state_chargazer: info<boolean>(),

   /** true if stardrake is dead */
   s_state_chilldrake: info<boolean>(),

   /** used gravometric inverter */
   s_state_inverter: info<boolean>(),

   /** true if the math puzzle was beat */
   s_state_mathpass: info<boolean>(),

   /** beat sans high score on xtower */
   s_state_million: info<boolean>(),

   /** used papyrus sink */
   s_state_papsink: info<boolean>(),

   /** true if the coins in papyrus's couch were taken */
   s_state_pilfer: info<boolean>(),

   /** sans left the sword in his room!!!!! */
   s_state_pendingsword: info<boolean>(),

   /** true if you didnt understand the explanation */
   s_state_puzzlenote: info<boolean>(),

   /** redbook */
   s_state_redbook: info<boolean>(),

   /** made a reservation at the start inn */
   s_state_reservation: info<boolean>(),

   /** unlocked sans's door with the key that happens to be described right below (wot) */
   s_state_sansdoor: info<boolean>(),

   /** played minigame in front of nice cream guy first time (at least 200 points) */
   s_state_scorereaction1: info<boolean>(),
   /** got bad score after setting good high score */
   s_state_scorereaction2: info<boolean>(),
   /** got good score after already having good high score */
   s_state_scorereaction4: info<boolean>(),
   /** got close to beating top scorer */
   s_state_scorereaction6: info<boolean>(),
   /** got bad score after setting bad high score */
   s_state_scorereaction7: info<boolean>(),
   /** got good score after having bad score with good high score */
   s_state_scorereaction8: info<boolean>(),
   /** got near to top score twice */
   s_state_scorereaction11: info<boolean>(),

   /** tried starton telescope (very poggers) */
   s_state_telescope: info<boolean>(),

   /** got sans's key */
   skeleton_key: info<boolean>(),

   /** toriel offers snail pie instead */
   snail_pie: info<boolean>(),

   // monster "spare" states (changed their lives)
   spared_astigmatism: info<boolean>(),
   spared_chilldrake: info<boolean>(),
   spared_froggit: info<boolean>(),
   spared_froggitex: info<boolean>(),
   spared_glyde: info<boolean>(),
   spared_jerry: info<boolean>(),
   spared_knightknight: info<boolean>(),
   spared_loox: info<boolean>(),
   spared_madjick: info<boolean>(),
   spared_migosp: info<boolean>(),
   spared_migospel: info<boolean>(),
   spared_moldbygg: info<boolean>(),
   spared_moldsmal: info<boolean>(),
   spared_mouse: info<boolean>(),
   spared_mushketeer: info<boolean>(),
   spared_mushy: info<boolean>(),
   spared_perigee: info<boolean>(),
   spared_pyrope: info<boolean>(),
   spared_radtile: info<boolean>(),
   spared_shyren: info<boolean>(),
   spared_spacetop: info<boolean>(),
   spared_stardrake: info<boolean>(),
   spared_tsundere: info<boolean>(),
   spared_whimsalot: info<boolean>(),
   spared_whimsun: info<boolean>(),
   spared_woshua: info<boolean>(),

   /** first starbert collectible */
   starbertA: info<boolean>(),

   /** second starbert collectible */
   starbertB: info<boolean>(),

   /** third starbert collectible */
   starbertC: info<boolean>(),

   /** ate gumbert :sob: */
   stargum: info<boolean>(),

   /** stole from blook shop */
   steal_blook: info<boolean>(),

   /** stole from bpants shop */
   steal_bpants: info<boolean>(),

   /** stole from thrift shop */
   steal_gossip: info<boolean>(),

   /** stole from hare shop */
   steal_hare: info<boolean>(),

   /** stole from tem shop */
   steal_tem: info<boolean>(),

   /** stole from tortoise shop */
   steal_tortoise: info<boolean>(),

   /** mom said its my turn to be the narrator */
   svr: info<boolean>(),

   /** true if toriel was spoken to once */
   toriel_ask: info<boolean>(),

   /** true if asked to go home */
   toriel_home: info<boolean>(),

   /** whether or not toriel saw twinkly attack frisk */
   toriel_twinkly: info<boolean>(),

   /** uber shortcut */
   ubershortcut: info<boolean>(),

   /** ultra shortcut */
   ultrashortcut: info<boolean>(),

   /** made undyne go "hard mode" */
   undyne_hardmode: info<boolean>(),

   /** undyne respects u */
   undyne_respecc: info<boolean>(),

   /** got sans's subscription voucher */
   voucher: info<boolean>(),

   /** true if player took last nap */
   w_state_catnap: info<boolean>(),

   /** true if player read 1 page in the diary */
   w_state_diary: info<boolean>(),

   /** left battle room */
   w_state_fightroom: info<boolean>(),

   /** lamp is off */
   w_state_lamp: info<boolean>(),

   /** managed to escape! */
   w_state_lateleave: info<boolean>(),

   /** talked to latetoriel */
   w_state_latetoriel: info<boolean>(),

   /** true if refused to solve riddle */
   w_state_riddleskip: info<boolean>(),

   /** true if soda was taken */
   w_state_soda: info<boolean>(),

   /** true if steak was taken */
   w_state_steak: info<boolean>(),

   /** tried to sneak away from toriel */
   w_state_youlittlesneaker: info<boolean>(),

   /** frisk has the W A T U H */
   water: info<boolean>(),

   /** you focking wot m8 */
   ufokinwotm8: info<boolean>()
};

export const dataNumber = {
   /** arma loop position :flushed: */
   armaloop: info<number>(),

   /**
    * alphys opinion of you
    * ```md
    * 0 - doesnt mind at all
    * 1 - sucks but its fine i guess
    * 2 - youre awful (or neutral genocide)
    * 3 - geno
    * ```
    */
   bad_lizard: info<0 | 1 | 2 | 3>(),

   // random number generator base values
   base_attack: info<number>(),
   base_battle: info<number>(),
   base_dialogue: info<number>(),
   base_overworld: info<number>(),
   base_pattern: info<number>(),

   /** total bullycount */
   bully: info<number>(),

   /** aerialis bullycount */
   bully_aerialis: info<number>(),

   /** foundry bullycount */
   bully_foundry: info<number>(),

   /** starton bullycount */
   bully_starton: info<number>(),

   /** outlands bullycount */
   bully_wastelands: info<number>(),

   /** how many times "Say Hello" was used in the CELL */
   cell_hello: info<number>(),

   /** how many times "Say Hello" was used in Asgore's CELL */
   cell_hello_asgore: info<number>(),

   /** how many times "Insult" was used in the CELL */
   cell_insult: info<number>(),

   /** how many times "Insult" was used in Asgore's CELL */
   cell_insult_asgore: info<number>(),

   /**
    * which flavor of pie was chosen
    * ```md
    * 0 - butterscotch
    * 1 - cinnamon
    * ```
    */
   choice_flavor: info<0 | 1>(),

   /** core kill count */
   corekills: info<number>(),

   /** times you "equipped" the corn dog */
   corndogger: info<number>(),

   /** encounters in current rooms? */
   encounters: info<number>(),

   /** last encounter id */
   encounters_last: info<number>(),

   /**
    * epiphany state
    * ```md
    * 0 - not activated
    * 1 - activated
    * 2 - taken
    * ```
    */
   epiphany: info<0 | 1 | 2>(),

   /** aerialis evac count */
   evac_aerialis: info<number>(),

   /** foundry evac count */
   evac_foundry: info<number>(),

   /** starton evac count */
   evac_starton: info<number>(),

   /** wastelands evac count */
   evac_wastelands: info<number>(),

   /** current EXP (LV is calculated from this) */
   exp: info<number>(),

   /** electro dampening fluids taken */
   fluids: info<number>(),

   /** current G */
   g: info<number>(),

   /** total unforced hits taken in battle */
   hits: info<number>(),

   /** current HP */
   hp: info<number>(),

   /** kill count */
   kills: info<number>(),

   /** aerialis kill count */
   kills_aerialis: info<number>(),

   /** foundry kill count */
   kills_foundry: info<number>(),

   /** starton kill count */
   kills_starton: info<number>(),

   /** outlands kill count */
   kills_wastelands: info<number>(),

   /** times interacted with blook in new house */
   lastblook: info<number>(),

   /** fuck off */
   lateasriel: info<number>(),

   /** narrator monologue for lv0 ending */
   narrator_monologue: info<number>(),

   /** oh no you di (int) ((((((((((((((((((((((((((manilovekilling)))))))))))))))))))))))))) */
   no_you_di_int: info<number>(),

   /**
    * progress in the outertale story
    * ```md
    * > progress in outlands
    * 0 - new game
    * 1 - met twinkly
    * 2 - was shown first puzzle
    * 2.01 - toriel left first puzzle room
    * 2.1 - was shown second puzzle
    * 2.11 - first rung passed
    * 2.12 - second rung passed
    * 2.2 - third rung passed, second puzzle done
    * 2.21 - toriel left second puzzle room
    * 2.3 - was shown dummy
    * 2.31 - asked toriel about conversation topics
    * 2.32 - went to toriel twice
    * 2.4 - dummy done
    * 2.41 - toriel left dummy room
    * 2.5 - was asked to solve third puzzle
    * 2.6 - encountered froggit
    * 2.601 - interacted with terminal once
    * 2.602 - talked to toriel once
    * 2.603 - interacted with terminal once, talked to toriel once
    * 2.61 - toriel entered password for you
    * 2.62 - toriel left room
    * 2.7 - was asked to be independent
    * 2.71 - left zigzag room before completing test
    * 3 - got cell phone
    * 4 - toriel left the zigzag room
    * 4.1 - what the dog doin?
    * 4.2 - tori got the phone back
    * 5 - entered the next room
    * 5.1 - completed first puzzle
    * 5.2 - completed second puzzle
    * 5.3 - completed third puzzle
    * 5.4 - completed fourth puzzle
    * 6 - encountered napstablook
    * 6.1 - completed ghost battle
    * 7 - met toriel in courtyard
    * 8 - toriel took you to your room
    * 8.1 - slept in the bed (random encounters disabled)
    * 8.2 - talked to toriel in the front room (sidequest enabled)
    * 9 - toriel is preparing breakfast
    * 9.1 - toriel finished prepping the breakfast
    * 10 - spoke to toriel about leaving
    * 11 - met toriel in hallway 1
    * 12 - met toriel in hallway 2
    * 13 - met toriel in hallway 3
    * 13.1 - lv0 confirmation
    * 14 - battled toriel
    * 15 - met twinkly again
    * 16 - exited the outlands
    *
    * > progress in starton and starton town
    * 16.1 - appeared in starton
    * 17.001 - intro point of no return
    * 17.1 - entered next room (geno: asriel gave you the rundown)
    * 18 - met sans and pap again
    * 18.1 - (geno: asriel talked about the sentry station)
    * 19 - crossed doggo
    * 20 - completed papyrus's maze
    * 20.2 - encounter lesser dog
    * 21 - "completed" sans's crossword puzzle
    * 23 - dog marriage
    * 24 - beat papyrus puzzle 1
    * 24.1 - met paps in next room
    * 25 - beat papyrus puzzle 2
    * 26 - got past papyrus's "jenga" puzzle
    * 27 - beat papyrus puzzle 3
    * 28 - crossed greater dog
    * 30 - the gauntlet of deadly terror!
    * 30.1 - narrator talked before papyrus battle
    * 31 - papyrus battle
    * 32 - exited starton (geno: asgore encounter 1)
    *
    * > progress in foundry
    * 33 - completed first date with sans
    * 35 - crossed doge
    * 36 - solved lazor puzzle 1
    * 37 - solved lazor puzzle 2
    * 37.1 - (geno: asgore encounter 2)
    * 37.11 - saw pap and undyne (geno: just undyne)
    * 37.2 - crossed the bridge
    * 38.01 - chase 1 end
    * 38.1 - (geno: asriel left)
    * 38.2 - (geno: asgore encounter 3)
    * 39 - crossed muffet
    * 40 - shyren
    * 42 - undyne chase 2
    * 42.1 - dummy
    * 43 - (geno: asriel returned with monster kid)
    * 44 - (geno: exit hub, asgore encounter 4)
    * 45 - solved lazor puzzle 3
    * 46 - cornered by undyne
    * 47 - monster kid bridge cutscene (geno: kiddprompt 1)
    * 47.1 - talked to undyne before fight (geno: kiddprompt 2)
    * 47.2 - undyne chase active
    * 48 - undyne fight
    *
    * > progress in aerialis
    * 48.1 - updated bad_lizard
    * 49 - met alphys (and first MTT show)
    * 51 - RG 01/02
    * 52 - barricades 1
    * 53 - barricades 2
    * 54 - barricades 3
    * 55 - first puzzle complete!
    * 55.1 - second MTT show started
    * 56 - second MTT show
    * 58.1 - second puzzle (checkpoint 1)
    * 58.2 - second puzzle (checkpoint 2)
    * 59 - second puzzle complete?
    * 59.1 - third MTT show started
    * 60 - third MTT show
    * 61 - RG 03/04
    * 62 - barricades passed
    * 63 - napstablook invited you to the right
    * 64 - alphys appeared at elevator
    *
    * > progress in rec center/core/citadel/archive
    * 64.1 - mtt show started without alphys
    * 65 - passed mtt show (rec center access)
    * 66 - completed second date with sans
    * 66.1 - first mercenary battle
    * 66.2 - second mercenary battle
    * 67 - unlocked the CORE door
    * 67.1 - mushketeer
    * 68 - MTT fight
    * 68.1 - end of alphys conversation
    * 69 - arrived at citadel (long elevator)
    * 70 - met asgore (geno: armageddon)
    * 71 - last corridor
    * 71.1 - arrived at archive (geno: final cutscene 1)
    * 71.2 - exit archive (geno: final cutscene 2)
    * 72 - the end
    * ```
    */
   plot: info<
      | 0
      | 1
      | 2
      | 2.01
      | 2.1
      | 2.11
      | 2.12
      | 2.2
      | 2.21
      | 2.3
      | 2.31
      | 2.32
      | 2.4
      | 2.41
      | 2.5
      | 2.6
      | 2.601
      | 2.602
      | 2.603
      | 2.61
      | 2.62
      | 2.7
      | 2.71
      | 3
      | 4
      | 4.1
      | 4.2
      | 5
      | 5.1
      | 5.2
      | 5.3
      | 5.4
      | 6
      | 6.1
      | 7
      | 8
      | 8.1
      | 8.2
      | 9
      | 9.1
      | 10
      | 11
      | 12
      | 13.1
      | 14
      | 14
      | 15
      | 16
      | 16.1
      | 17.001
      | 17.1
      | 18
      | 18.1
      | 19
      | 20
      | 20.2
      | 21
      | 23
      | 24
      | 24.1
      | 25
      | 26
      | 27
      | 28
      | 30
      | 30.01
      | 30.02
      | 30.1
      | 31
      | 32
      | 33
      | 35
      | 36
      | 37
      | 37.1
      | 37.11
      | 37.2
      | 38.01
      | 38.1
      | 38.2
      | 39
      | 40
      | 42
      | 42.1
      | 43
      | 44
      | 45
      | 46
      | 47
      | 47.1
      | 47.2
      | 48
      | 48.1
      | 49
      | 51
      | 52
      | 53
      | 54
      | 55
      | 55.1
      | 56
      | 58.1
      | 58.2
      | 59
      | 59.1
      | 60
      | 61
      | 62
      | 63
      | 64
      | 64.1
      | 65
      | 66
      | 66.1
      | 66.2
      | 67
      | 67.1
      | 68
      | 68.1
      | 69
      | 70
      | 71
      | 71.1
      | 71.2
      | 72
   >(),

   /** approach progress - alphys calls (bad robot: scared alphys) (geno: core) */
   plot_approach: info<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(),

   /**
    * toriel call count
    * ```md
    * > toriel
    * 0 - no call yet
    * 1 - pie flavor
    * 2 - other pie flavor
    * 3 - allergies
    * 4 - inventory space
    *
    * > papyrus
    * 5 - sans call 1 (secret: papyrus check in 1)
    * 6 - sans call 2 (secret: papyrus check in 2)
    *
    * > alphys
    * 7 - entered h_hub5 (saw citadelevator door)
    * 7.1 - saw CORE room
    * 8 - CORE exit
    * ```
    */
   plot_call: info<0 | 1 | 2 | 3 | 4 | 5 | 5.1 | 6 | 7 | 7.1 | 8>(),

   /**
    * date count
    * ```md
    * 0 - no date yet
    * 0.1 - talked to papyrus outside
    * 0.2 - went into papyrus room
    * 1 - papyrus date done
    * 1.1 - left papyrus's room (used for phone calls)
    * 1.2 - talked to papyrus outside the house
    * 1.3 - undyne house accessible
    * 2 - undyne date done
    * 2.1 - left undyne's house
    * ```
    */
   plot_date: info<0 | 0.1 | 0.2 | 1 | 1.1 | 1.2 | 1.3 | 2 | 2.1>(),

   /**
    * date check
    * ```md
    * 0 - no check yet
    * 1 - told to date papyrus
    * 2 - told to date undyne
    * ```
    */
   plot_datecheck: info<0 | 1 | 2>(),

   /**
    * epilogue progress
    * ```md
    * 0 - none yet
    * 1 - papyrus call (to confirm they remember everything except who you fought)
    * 2 - talked to sans in corridor
    * 3 - met asgore at house (date: got intercepted by alphys)
    * 4 - toriel call
    * 5 - found toriel in foundry
    * ```
    */
   plot_epilogue: info<0 | 1 | 2 | 3 | 4 | 5>(),

   /**
    * monster kid dialogue triggers progress
    * ```md
    * 0 - no dialogue yet
    * 1 - error room dialogue
    * 2 - muffet dialogues
    * 3 - pathway dialogue
    * 3.1 - path dialogue 2
    * 3.2 - path dialogue 3
    * 3.3 - path dialogue 4
    * 4 - view exit
    * ```
    */
   plot_kidd: info<0 | 1 | 2 | 3 | 3.1 | 3.2 | 3.3 | 4>(),

   /** outernet messages (checked) */
   plot_pmcheck: info<number>(),

   /**
    * papyrus puzzle hint section progression
    * ```md
    * 0 - no help
    * 1 - hint 1
    * 2 - hint 2
    * 3 - prompted for full solution
    * 4 - full solution
    * ```
    */
   plot_puzzlecheck: info<0 | 1 | 2 | 3 | 4>(),

   /** stalker twinkly */
   plot_stalker: info<number>(),

   /** sans told you to eat (just do it or you will die to funny mad dog) */
   sans_doge_warning: info<number>(),

   /** sans shadow walk progress */
   shadowsans: info<number>(),

   /** shop talk - life advice (bpants) */
   shop_bpants_advice: info<number>(),

   /** shop talk - the hub (bpants) */
   shop_bpants_hub: info<number>(),

   /** shop talk - mettaton (bpants) */
   shop_bpants_mtt1: info<number>(),

   /** shop talk - killed mettaton (bpants) */
   shop_bpants_mtt2: info<number>(),

   /** shop talk - undyne (after geno death) */
   shop_deadfish: info<number>(),

   /** shop talk - gerson */
   shop_gerson: info<number>(),

   /** shop talk - alphys (gossip) */
   shop_gossip_alphys: info<number>(),

   /** shop talk - hub (gossip) */
   shop_gossip_hub: info<number>(),

   /** shop talk - homeworld */
   shop_homeworld: info<number>(),

   /** temmie special sell countdown */
   specsell: info<number>(),

   /** number of barricades successfully passed */
   state_aerialis_barricuda: info<number>(),

   /** bullies when mtt warned you */
   state_aerialis_basebully: info<number>(),

   /** kills when mtt warned you */
   state_aerialis_basekill: info<number>(),

   /** times alphys opened the phone lines */
   state_aerialis_coreenter: info<number>(),

   /** times alphys closed the phone lines */
   state_aerialis_coreleave: info<number>(),

   /**
    * core - puzzler's path state
    * ```md
    * 0 - no puzzle solved
    * 1 - first puzzle solved
    * 2 - second puzzle solved
    * 3 - switch was flipped
    * ```
    */
   state_aerialis_corepath_puzzle: info<0 | 1 | 2 | 3>(),

   /**
    * core - path state
    * ```md
    * 0 - no side chosen yet
    * 1 - currently on puzzler's side
    * 2 - currently on warrior's side
    * ```
    */
   state_aerialis_corepath_state: info<0 | 1 | 2>(),

   /**
    * core - warrior's path state
    * ```md
    * 0 - no battle passed
    * 1 - first battle passed
    * 2 - second battle passed
    * 3 - switch was flipped
    * ```
    */
   state_aerialis_corepath_warrior: info<0 | 1 | 2 | 3>(),

   /** how many corn dogs purchased (used for corn goat) */
   state_aerialis_corngoat: info<0 | 1 | 2>(),

   /**
    * outcome of the crafting show
    * ```md
    * 0 - didn't use jetpack
    * 1 - used jetpack, but failed to reach end
    * 2 - used jetpack, got kinda far but still failed to reach end
    * 3 - reached end just in time
    * 4 - reached end easily
    * ```
    */
   state_aerialis_crafterresult: info<0 | 1 | 2 | 3 | 4>(),

   /**
    * capstation lockup state
    * ```md
    * 0 - not opened
    * 1 - opened, but untouched
    * 2 - took an item
    * 3 - took another item
    * 4 - cleaned 'er out
    * ```
    */
   state_aerialis_lockup: info<0 | 1 | 2 | 3 | 4>(),

   /** asriel monologues */
   state_aerialis_monologue: info<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(),

   /** times seen monologue 1 */
   state_aerialis_monologue_iteration1: info<number>(),

   /** times seen monologue 2 */
   state_aerialis_monologue_iteration2: info<number>(),

   /** times attacked mettaton in final battle */
   state_aerialis_mettastrikes: info<number>(),

   /** mtt bully nickname */
   state_aerialis_moniker: info<0 | 1 | 2 | 3 | 4>(),

   /** mtt (ex) "quiz" "answer" */
   state_aerialis_mttanswer: info<0 | 1 | 2 | 3 | 4>(),

   /** phase offset */
   state_aerialis_puzzle2os: info<number>(),

   /**
    * royal guards battle outcome
    * ```md
    * 0 - confession (dark neutral: bullied)
    * 1 - killed
    * ```
    */
   state_aerialis_royalguards: info<0 | 1>(),

   /** times failed on talent show */
   state_aerialis_talentfails: info<number>(),

   /** times interacted with CORE terminals when on the line with alphys */
   state_aerialis_terminter: info<number>(),

   /** how close you were to guessing prices exactly */
   state_aerialis_valuediff: info<number>(),

   /**
    * archive progress
    * ```md
    * 0 - none yet
    * 1 - patience/toriel/outlands
    * 2 - bravery/gerson/starton
    * 3 - integrity/roman/foundryA
    * 4 - perserverance/napstablook/foundryB
    * 5 - kindness/asgore/aerialis
    * 6 - justice/surface
    * ```
    */
   state_citadel_archive: info<0 | 1 | 2 | 3 | 4 | 5 | 6>(),

   /** hp before entering the archive */
   state_citadel_hp: info<number>(),

   /**
    * isn't it your responsibility to do the right thing?
    * ```md
    * 0 - not asked
    * 1 - yessir
    * 2 - nope
    * ```
    */
   state_citadel_responsibility: info<0 | 1 | 2>(),

   /** times refused to enter archive */
   state_citadel_refuse: info<number>(),

   /** astronaut foods taken */
   state_foundry_astrofood: info<number>(),

   /**
    * napstablook hangout progress
    * ```md
    * 0 - not visited yet
    * 0.1 - blook seen in hub
    * 0.2 - blook seen in blooky room
    * 1 - visited
    * 2 - ate from the fridge (thundersnail unlocked)
    * ```
    */
   state_foundry_blookdate: info<0 | 0.1 | 0.2 | 1 | 2>(),

   /**
    * music playing in napstablook's house
    * ```md
    * 0 - no music playing
    * 1 - spooktune
    * 2 - spookwave
    * 3 - spookwaltz
    * ```
    */
   state_foundry_blookmusic: info<0 | 1 | 2 | 3>(),

   /**
    * doge battle outcome
    * ```md
    * 0 - spared
    * 1 - killed
    * 2 - petted (lv0)
    * 3 - flirted
    * ```
    */
   state_foundry_doge: info<0 | 1 | 2 | 3>(),

   state_foundry_hapstacom1: info<number>(),
   state_foundry_hapstacom2: info<number>(),
   state_foundry_hapstacom3: info<number>(),
   state_foundry_hapstacom4: info<number>(),
   state_foundry_hapstacom5: info<number>(),
   state_foundry_hapstacom6: info<number>(),

   /**
    * times mk bullied
    * ```md
    * 0 - none
    * 1 - once
    * 2 - repeated
    * ```
    */
   state_foundry_kiddbully: info<number>(),

   /** number of deaths witnessed by monster kid */
   state_foundry_kidddeath: info<number>(),

   /** mk spear reaction */
   state_foundry_kiddreaction: info<number>(),

   /** number of bullys witnessed by monster kid */
   state_foundry_kiddrunner: info<number>(),

   /** number of battle turns taken by monster kid */
   state_foundry_kiddturns: info<number>(),

   /**
    * outcome of mad dummy battle
    * ```md
    * 0 - spared
    * 1 - killed (glad dummy)
    * 2 - befriended (unused, check state_wastelands_toriel instead)
    * 3 - bored
    * 4 - hugged (glad dummy)
    * 5 - slapped (glad dummy)
    * ```
    */
   state_foundry_maddummy: info<0 | 1 | 3 | 4 | 5>(),

   /**
    * muffet battle outcome
    * ```md
    * 0 - spared
    * 1 - killed
    * 2 - bribed (lv0)
    * 3 - flirted
    * ```
    */
   state_foundry_muffet: info<0 | 1 | 2 | 3>(),

   /**
    * npc86 survey
    * ```md
    * 0 - not surveyed yet
    * 1 - declined survey
    * 2 - accepted survey, answered "red"
    * 3 - accepted survey, answered "green"
    * 4 - accepted survey, answered "blue"
    * 5 - accepted survey, answered "not sure"
    * ```
    */
   state_foundry_npc86: info<0 | 1 | 2 | 3 | 4 | 5>(),

   /**
    * npc86 opinion
    * ```md
    * 0 - not asked yet
    * 1 - replied with "love"
    * 2 - replied with "disgust"
    * 3 - replied with "none"
    * 4 - replied with "not sure"
    * ```
    */
   state_foundry_npc86_feelings: info<0 | 1 | 2 | 3 | 4>(),

   /**
    * npc86 mood
    * ```md
    * 0 - not asked yet
    * 1 - replied with "good"
    * 2 - replied with "neutral"
    * 3 - replied with "bad"
    * 4 - replied with "not sure"
    * ```
    */
   state_foundry_npc86_mood: info<0 | 1 | 2 | 3 | 4>(),

   /** number of punch cards available */
   state_foundry_punchcards: info<number>(),

   // positions of foundry puzzle pylons
   state_foundry_puzzlepylon1Ax: info<number>(),
   state_foundry_puzzlepylon1Ay: info<number>(),
   state_foundry_puzzlepylon1Bx: info<number>(),
   state_foundry_puzzlepylon1By: info<number>(),
   state_foundry_puzzlepylon2Ax: info<number>(),
   state_foundry_puzzlepylon2Ay: info<number>(),
   state_foundry_puzzlepylon2Bx: info<number>(),
   state_foundry_puzzlepylon2By: info<number>(),
   state_foundry_puzzlepylon2Cx: info<number>(),
   state_foundry_puzzlepylon2Cy: info<number>(),
   state_foundry_puzzlepylon2Dx: info<number>(),
   state_foundry_puzzlepylon2Dy: info<number>(),
   state_foundry_puzzlepylon3Ax: info<number>(),
   state_foundry_puzzlepylon3Ay: info<number>(),
   state_foundry_puzzlepylon3Bx: info<number>(),
   state_foundry_puzzlepylon3By: info<number>(),
   state_foundry_puzzlepylon3Cx: info<number>(),
   state_foundry_puzzlepylon3Cy: info<number>(),
   state_foundry_puzzlepylon3Dx: info<number>(),
   state_foundry_puzzlepylon3Dy: info<number>(),
   state_foundry_puzzlepylon3Ex: info<number>(),
   state_foundry_puzzlepylon3Ey: info<number>(),
   state_foundry_puzzlepylon3Fx: info<number>(),
   state_foundry_puzzlepylon3Fy: info<number>(),
   state_foundry_puzzlepylon3Gx: info<number>(),
   state_foundry_puzzlepylon3Gy: info<number>(),
   state_foundry_puzzlepylon3Hx: info<number>(),
   state_foundry_puzzlepylon3Hy: info<number>(),

   /** number of spiders encountered in muffet area */
   state_foundry_spiders: info<number>(),

   /**
    * state of talking to napstablook about music
    * ```md
    * 0 - not talked yet
    * 1 - talked once
    * 2 - was asked about hidden song
    * 3 - approved of hidden song
    * 4 - disapproved of hidden song
    * ```
    */
   state_foundry_swansong: info<0 | 1 | 2 | 3 | 4>(),

   /**
    * temmie pet state
    * ```md
    * 0 - not asked to pet temmie yet
    * 1 - pet temmie
    * 2 - DIDNT PET TEMMIE!??!?!?!?!?!?
    * ```
    */
   state_foundry_tempet: info<0 | 1 | 2>(),

   /** number of times thundersnail was played */
   state_foundry_thundersnail: info<number>(),

   /**
    * final outcome of undyne
    * ```md
    * 0 - spared
    * 1 - left for dead
    * 2 - killed
    * ```
    */
   state_foundry_undyne: info<0 | 1 | 2>(),

   /** times captured by papyrus */
   state_papyrus_capture: info<number>(),

   /**
    * WHAT WILL YOU DO WITH THE SPAGHETTI?
    * ```md
    * 0 - not talked yet
    * 1 - said you'd share it
    * 2 - said you'd eat it
    * ```
    */
   state_papyrus_spaghet: info<0 | 1 | 2>(),

   /**
    * papyrus side house
    * ```md
    * 0 - not looked
    * 1 - looked and appreciated
    * 2 - looked and didn't appreciate
    * ```
    */
   state_papyrus_view: info<0 | 1 | 2>(),

   /**
    * state of the pie given by toriel
    * ```md
    * 0 - not given
    * 1 - given
    * 2 - put into inventory
    * ```
    */
   state_pie: info<0 | 1 | 2>(),

   /**
    * asriel bridge wait (defunct)
    * ```md
    * 0 - not talked yet
    * 1 - got told about monsters
    * 2 - was asked to proceed
    * ```
    */
   state_starton_azzybridge: info<0 | 1 | 2>(),

   // number of nicecreams stolen
   state_starton_creamz: info<number>(),

   /**
    * doggo battle outcome
    * ```md
    * 0 - petted
    * 1 - played fetch
    * 2 - killed
    * 3 - bully
    * ```
    */
   state_starton_doggo: info<0 | 1 | 2 | 3>(),

   /**
    * dog marriage battle outcome
    * ```md
    * 0 - petted
    * 1 - played fetch
    * 2 - killed
    * 3 - bully
    * ```
    */
   state_starton_dogs: info<0 | 1 | 2 | 3>(),

   /**
    * greater dog battle outcome
    * ```md
    * 0 - contented
    * 1 - played fetch
    * 2 - killed
    * 3 - bored out
    * ```
    */
   state_starton_greatdog: info<0 | 1 | 2 | 3>(),

   /**
    * jukebox song
    * ```md
    * 0 - sans.
    * 1 - ghost jam
    * 2 - rec centre
    * 3 - funny megalovania
    * ```
    */
   state_starton_jukebox: info<0 | 1 | 2 | 3>(),

   /** play fetch later then the start at lv 0 */
   state_starton_latefetch: info<number>(),

   /**
    * lesser dog battle outcome
    * ```md
    * 0 - petted
    * 1 - played fetch
    * 2 - killed
    * 3 - bully
    * ```
    */
   state_starton_lesserdog: info<0 | 1 | 2 | 3>(),

   /**
    * number of nice creams purchased
    * ```md
    * 0.1 - met guy
    * 0.2 - guy gave you free nice cream
    * ```
    */
   state_starton_nicecream: info<number>(),

   /**
    * npc98 state
    * ```md
    * 0 - not met yet
    * 1 - got chip 1
    * 2 - got chip 2
    * 3 - ohno
    * 4 - betrayal
    * 4.1 - late betrayal
    * ```
    */
   state_starton_npc98: info<0 | 1 | 2 | 3 | 4 | 4.1>(),

   /**
    * papyrus battle state
    * ```md
    * 0 - friend
    * 1 - dead
    * ```
    */
   state_starton_papyrus: info<0 | 1>(),

   /** puzzle states */
   state_starton_s_puzzle1: info<number>(),
   state_starton_s_puzzle2: info<number>(),
   state_starton_s_puzzle3: info<number>(),

   /**
    * state of the inn
    * ```md
    * 0 - not used
    * 1 - used free
    * 2 - used by paying
    * ```
    */
   state_starton_sleep: info<0 | 1 | 2>(),

   /**
    * HEY YOU TOUCHA MY SPAGHET
    * ```md
    * 0 - not touched
    * 1 - lowered
    * 2 - taken
    * ```
    */
   state_starton_spaghetti: info<0 | 1 | 2>(),

   /**
    * sans trash planet progress
    * ```md
    * 0 - haven't met yet
    * 1 - sans guided you to trash
    * 2 - beat minigame
    * ```
    */
   state_starton_trashprogress: info<0 | 1 | 2>(),

   /** hi-score on the xtower game thing */
   state_starton_xtower: info<number>(),

   /**
    * state of toriel's book
    * ```md
    * 0 - not asked
    * 1 - asked
    * 2 - head the book
    * ```
    */
   state_toriel_book: info<0 | 1 | 2>(),

   /**
    * state of toriel's breakfast
    * ```md
    * 0 - not asked
    * 1 - asked
    * 2 - preparing
    * 3 - prepared
    * 4 - put into inventory
    * ```
    */
   state_toriel_food: info<0 | 1 | 2 | 3 | 4>(),

   /** times the player has "run away" from home ahead of toriel */
   state_toriel_runaway: info<number>(),

   /** items taken from the vending machine (0-4) */
   state_wastelands_candy: info<number>(),

   /**
    * dummy battle state
    * ```md
    * 0 - talk ending
    * 1 - dummy was attacked (and killed)
    * 2 - ran away from the dummy
    * 3 - shenanigans ending
    * 4 - hug ending
    * 5 - slap my nuts
    * 6 - flirt
    * ```
    */
   state_wastelands_dummy: info<0 | 1 | 2 | 3 | 4 | 5 | 6>(),

   /**
    * first froggit battle state
    * ```md
    * 0 - no action yet
    * 1 - compliment
    * 2 - flirt
    * 3 - flee
    * 4 - threaten
    * 5 - fight
    * ```
    */
   state_wastelands_froggit: info<0 | 1 | 2 | 3 | 4 | 5>(),

   /**
    * state of the smashed pie
    * ```md
    * 0 - didn't smash
    * 1 - smashed before
    * 2 - smashed after
    * ```
    */
   state_wastelands_mash: info<number>(),

   /**
    * napstablook battle state
    * ```md
    * 0 - cheer/spare ending
    * 1 - flirt ending
    * 2 - sour ending
    * 3 - awkward
    * 4 - the "nothing personal" ending
    * 5 - skipped battle
    * ```
    */
   state_wastelands_napstablook: info<0 | 1 | 2 | 3 | 4 | 5>(),

   /**
    * toriel battle state
    * ```md
    * 0 - happy
    * 1 - sad
    * 2 - dead
    * 3 - flee ending
    * 4 - early flee ending
    * ```
    */
   state_wastelands_toriel: info<0 | 1 | 2 | 3 | 4>(),

   /** steps in current room */
   steps: info<number>(),

   /** extra variable for encounter wait time */
   steps_factor: info<number>(),

   /**
    * SVR advancement
    * 0 - none yet
    * 1 - reached outlands
    * 2 - reached outlands entrance
    * 3 - reached asriel room
    * 4 - monologue 1
    * 5 - monologue 2
    * 6 - monologue 3
    * 7 - monologue 4
    * 8 - monologue 5
    * 9 - monologue 6
    * 10 - monologue 7
    * 11 - monologue 8
    * 12 - monologue 9
    * 13 - monologue 10
    * 14 - monologue 11
    * 15 - monologue 12
    * 16 - monologue 13
    */
   svr_adv: info<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16>(),

   /** nose nuzzles */
   svr_nuz: info<number>(),

   /** hp the tablaphone needs to restore */
   tabla_hp: info<number>(),

   /** elapsed time in frames */
   time: info<number>(),

   /** elapsed time in frames (delta item effect) */
   time_delta: info<number>(),

   /** deltasystem add time */
   time_delta_add: info<number>(),

   /** undyne attack runoff (turns until she believes your pleas) */
   undyne_attackRunoff: info<number>(),

   /**
    * the drink you chose in the undyne date
    * ```md
    * 0 - water
    * 1 - exoberry punch
    * 2 - hot cocoa
    * 3 - tea
    * ```
    */
   undyne_drink: info<number>(),

   /** undyne HP */
   undyne_hp: info<number>(),

   /**
    * undyne fight phase
    * ```md
    * 0 - phase 1 (not encountered yet)
    * 1 - phase 2
    * 2 - phase 3
    * 3 - phase 4
    * 4 - phase 4 (repeat encounter)
    * ```
    */
   undyne_phase: info<0 | 1 | 2 | 3 | 4>(),

   /** undyne fight speed (challenge/plead) */
   undyne_speed: info<number>(),

   /** exotic matter differential */
   xm: info<number>()
};

export const dataString = {
   /** current armor */
   armor: info<string>(),

   // asriel interaction counters for svr
   asrielinter: info<string>(),

   /** encounter history */
   encounters: info<string>(),

   /** name of the first fallen human */
   name: info<string>(),

   /** events triggered by post-neutral */
   nootflags: info<string>(),

   /** messages sent by alphys */
   pms: info<string>(),

   /** current room */
   room: info<string>(),

   /** kill counts in various rooms */
   room_kills: info<string>(),

   /** pattern in core puzzle 1 */
   state_aerialis_a_core_left1: info<string>(),

   /** pattern in core puzzle 2 */
   state_aerialis_a_core_left2: info<string>(),

   /** stored armor */
   state_citadel_armor: info<string>(),

   /** stored inventory */
   state_citadel_inventory: info<string>(),

   /** stored weapon */
   state_citadel_weapon: info<string>(),

   /** room that undyne dies in */
   state_foundry_deathroom: info<string>(),

   /** holes in chase */
   state_foundry_f_chaseHole: info<string>(),

   /** traps set off in chase */
   state_foundry_f_chaseTrap: info<string>(),

   /** laser state in foundry puzzle 1 */
   state_foundry_f_puzzle1: info<string>(),

   /** laser state in foundry puzzle 2 */
   state_foundry_f_puzzle2: info<string>(),

   /** laser state in foundry puzzle 3 */
   state_foundry_f_puzzle3: info<string>(),

   /** selected pattern in starton puzzle 3 */
   state_starton_s_puzzle3: info<string>(),

   /** monster kid state in town */
   state_starton_s_town1: info<string>(),

   /** current weapon */
   weapon: info<string>()
};

export const flagBoolean = {
   /** died */
   _died: info<boolean>(),

   /** seen mtt pre-turn cutscene */
   _legs: info<boolean>(),

   /** asriel realized alphys identity/attack */
   _mad_lizard: info<boolean>(),

   /** reloaded inexplicably after sleeping in a bed in bully route */
   _okaythatsweird: info<boolean>(),

   /** seen opera cutscene */
   _opera: info<boolean>(),

   /** last set a flag */
   _victory: info<boolean>(),

   /** yes its the funni meme shut up */
   _waaaaaooaaooooaaaaaaooohooohooohstooooryofunderrtaaaaale: info<boolean>(),

   /** seen cocoa */
   $cocoa: info<boolean>(),

   /** true if epilepsy-safe mode is enabled */
   $option_epilepsy: info<boolean>(),

   /** true if fancy graphics is enabled */
   $option_fancy: info<boolean>(backend !== null),

   /** true if music is disabled */
   $option_music: info<boolean>(),

   /** left-handed mobile */
   $option_right: info<boolean>(),

   /** true if sfx is disabled */
   $option_sfx: info<boolean>(),

   /** completed the lv0 route */
   $svr: info<boolean>(),

   /** asriel knows his royal access code works */
   asriel_access: info<boolean>(),

   /** asriel commented about burger */
   asriel_bpants: info<boolean>(),

   /** asriel knows who shorted out the electrics */
   asriel_electrics: info<boolean>(),

   /** asriel died at least once in shuttle */
   asriel_exploded: info<boolean>(),

   /** asriel knows you know where the cellphone is. */
   asriel_phone: info<boolean>(),

   /** asriel commented on chara landing spot */
   asriel_trashcom: info<boolean>(),

   /** :flushed: */
   asriel_earpull: info<boolean>(),

   /** true if twinkly post-geno reset end dialogue happened */
   confront_twinkly: info<boolean>(),

   /** true if twinkly post-geno reset end dialogue happened (mad version) */
   enrage_twinkly: info<boolean>(),

   /** lv20 ending confirmed */
   lv20: info<boolean>(),

   // neutral lv meet counters (0 is lv2, 1 is lv3, etc.)
   meet3_0: info<boolean>(),
   meet3_1: info<boolean>(),
   meet3_2: info<boolean>(),
   meet3_3: info<boolean>(),
   meet3_4: info<boolean>(),
   meet3_5: info<boolean>(),
   meet3_6: info<boolean>(),
   meet3_7: info<boolean>(),
   meet3_8: info<boolean>(),
   meet3_9: info<boolean>(),
   meet3_10: info<boolean>(),
   meet3_11: info<boolean>(),
   meet3_12: info<boolean>(),

   /** primer for neutral ending post-reload dialogue */
   neutral_reload: info<boolean>(),

   /** if twinkly talked about messing with puzzles and monsters */
   neutral_reload_interloper: info<boolean>(),

   /** hug the goat or i will personally come to your house and steal all of your teddy bears */
   pacifist_marker_comfort: info<boolean>(),

   /** forgive (bully route: forsake) */
   pacifist_marker_forgive: info<boolean>(),

   /** saved undyne and alphys */
   pacifist_marker_save1: info<boolean>(),

   /** saved undyne and alphys (assist flag) */
   pacifist_marker_save1_assist: info<boolean>(),

   /** saved sans and papyrus */
   pacifist_marker_save2: info<boolean>(),

   /** saved sans and papyrus (assist flag) */
   pacifist_marker_save2_assist: info<boolean>(),

   /** saved toriel and asgore */
   pacifist_marker_save3: info<boolean>(),

   /** saved toriel and asgore (assist flag) */
   pacifist_marker_save3_assist: info<boolean>(),

   /** true if twinkly already said post reset speech at start of outlands */
   reset_twinkly: info<boolean>(),

   /** true if twinkly hinted at his plan */
   reveal_twinkly: info<boolean>(),

   /** completed pacifist ending, unlocked true reset */
   true_reset: info<boolean>(),

   /** seen pacifist post-reload spiel regarding true reset */
   true_reset_spiel: info<boolean>(),

   /** ultra shortcut acknowledged by twinkly */
   ultra_twinkly: info<boolean>()
};

export const flagNumber = {
   /** bob knows what you did (even across reload!?!?!?!?!??!?!/1/1/1/tjgy87GHByuRHGvjE*&r6ybj3ht487erytfg7384brG*(7rh)) */
   _bob: info<number>(),

   /** times died */
   _deaths: info<number>(),

   /** genocide progression milestones (last triggered) */
   _genocide_milestone_last: info<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(),

   /** joystick activation threshold */
   $option_deadzone: info<number>(0.5),

   /** music level */
   $option_music: info<number>(0.2),

   /** sfx level */
   $option_sfx: info<number>(0.2),

   /** assist realization state (undyne ex) */
   azzy_assist: info<number>(),

   /** times fought mtt neo */
   azzy_neo: info<number>(),

   /** backtracked to start pre-asriel fight */
   backtrack_twinkly: info<number>(),

   /** how many times twinkly has been met */
   encounter_twinkly: info<number>(),

   // genocide asriel's memory
   ga_asriel0: info<number>(),
   ga_asriel1: info<number>(),
   ga_asriel6: info<number>(),
   ga_asriel9: info<number>(),
   ga_asriel10: info<number>(),
   ga_asriel17: info<number>(),
   ga_asriel24: info<number>(),
   ga_asriel26: info<number>(),
   ga_asriel28: info<number>(),
   ga_asriel29: info<number>(),
   ga_asriel30: info<number>(),
   ga_asriel30d: info<number>(),
   ga_asriel30x: info<number>(),
   ga_asriel33: info<number>(),
   ga_asriel35: info<number>(),
   ga_asriel38: info<number>(),
   ga_asriel40: info<number>(),
   ga_asriel43: info<number>(),
   ga_asriel46: info<number>(),
   ga_asriel49: info<number>(),
   ga_asriel52: info<number>(),
   ga_asriel53: info<number>(),
   ga_asriel54: info<number>(),
   ga_asriel55: info<number>(),
   ga_asriel56: info<number>(),
   ga_asriel57: info<number>(),
   ga_asriel98: info<number>(),
   ga_asriel99: info<number>(),
   ga_asrielAlphysCom1: info<number>(),
   ga_asrielAlphysCom2: info<number>(),
   ga_asrielAlphysCom3: info<number>(),
   ga_asrielAlphysCom4: info<number>(),
   ga_asrielAlphysCom5: info<number>(),
   ga_asrielAlphysMonologue: info<number>(),
   ga_asrielAssist: info<number>(),
   ga_asrielAwaken: info<number>(),
   ga_asrielBeast: info<number>(),
   ga_asrielBoop: info<number>(),
   ga_asrielCoffin: info<number>(),
   ga_asrielCore0: info<number>(),
   ga_asrielCore1: info<number>(),
   ga_asrielCore2: info<number>(),
   ga_asrielCore4: info<number>(),
   ga_asrielCore5: info<number>(),
   ga_asrielCore6: info<number>(),
   ga_asrielCorenote: info<number>(),
   ga_asrielDog: info<number>(),
   ga_asrielDogepoke: info<number>(),
   ga_asrielDrawing: info<number>(),
   ga_asrielDrink: info<number>(),
   ga_asrielDummy: info<number>(),
   ga_asrielEcho1: info<number>(),
   ga_asrielEcho4: info<number>(),
   ga_asrielElectrics0: info<number>(),
   ga_asrielElectrics1: info<number>(),
   ga_asrielEpic: info<number>(),
   ga_asrielFetchSpare: info<number>(),
   ga_asrielFinally: info<number>(),
   ga_asrielFinalReaction: info<number>(),
   ga_asrielFireplace: info<number>(),
   ga_asrielGate: info<number>(),
   ga_asrielGetThePhone: info<number>(),
   ga_asrielGetThePhone2: info<number>(),
   ga_asrielHotel0: info<number>(),
   ga_asrielHotel1: info<number>(),
   ga_asrielHotel2: info<number>(),
   ga_asrielIntro: info<number>(),
   ga_asrielKidd2: info<number>(),
   ga_asrielKiddFinal1: info<number>(),
   ga_asrielKiddFinal3a: info<number>(),
   ga_asrielKiddFinal3b: info<number>(),
   ga_asrielLab1: info<number>(),
   ga_asrielLab3: info<number>(),
   ga_asrielLab4: info<number>(),
   ga_asrielLab5: info<number>(),
   ga_asrielLift: info<number>(),
   ga_asrielLiftC: info<number>(),
   ga_asrielMadfish: info<number>(),
   ga_asrielMoneyT2: info<number>(),
   ga_asrielMoneyX3: info<number>(),
   ga_asrielMoneyX4: info<number>(),
   ga_asrielMonologue: info<number>(),
   ga_asrielMonologueX: info<number>(),
   ga_asrielMonologueY: info<number>(),
   ga_asrielNapstakill: info<number>(),
   ga_asrielOnion: info<number>(),
   ga_asrielOutlands5: info<number>(),
   ga_asrielOutlands6: info<number>(),
   ga_asrielOutlands7: info<number>(),
   ga_asrielPapyrus: info<number>(),
   ga_asrielPuzzleStop1: info<number>(),
   ga_asrielQuestion: info<number>(),
   ga_asrielRespawn0: info<number>(),
   ga_asrielRespawn1: info<number>(),
   ga_asrielRespawn2: info<number>(),
   ga_asrielRespawn4: info<number>(),
   ga_asrielRespawn6: info<number>(),
   ga_asrielRespawn7: info<number>(),
   ga_asrielRobo1: info<number>(),
   ga_asrielSkySign1: info<number>(),
   ga_asrielSpanner: info<number>(),
   ga_asrielSpannerComment: info<number>(),
   ga_asrielStutter: info<number>(),
   ga_asrielTerminal1: info<number>(),
   ga_asrielTimewaster: info<number>(),
   ga_asrielUndying: info<number>(),
   ga_asrielUndyneX: info<number>(),
   ga_asrielVoicemail: info<number>(),
   ga_asrielWitness: info<number>(),
   ga_asrielXtower: info<number>(),

   /**
    * genocide progression milestones
    * ```md
    * 0 - not milestone yet
    * 1 - end starton
    * 2 - end foundry
    * 3 - mtt announces his plan
    * 4 - end aerialis
    * 5 - alphys appears
    * 6 - defeat alphys
    * 7 - shuttle
    * ```
    */
   genocide_milestone: info<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(),

   /** number of times the genocide route has started */
   genocide_twinkly: info<number>(),

   /** number of times sans was killed in geno */
   killed_sans: info<number>(),

   /** number of times sans has been met in last corridor */
   meet1: info<number>(),

   /** number of times sans has been met in last corridor at lv0 or lv1 */
   meet2: info<number>(),

   /** number of times sans has been met in last corridor on ultrashortcut */
   meet3: info<number>(),

   /** twinkly post fight reload dialogue counter */
   neutral_repeat: info<number>(),

   /** twinkly RNG base value */
   neutral_twinkly_base: info<number>(),

   /**
    * twinkly final choice
    * ```md
    * 0 - mercy
    * 1 - fight
    * ```
    */
   neutral_twinkly_choice: info<0 | 1>(),

   /** twinkly death count */
   neutral_twinkly_gameover: info<number>(),

   /** number of times the neutral route has ended */
   neutral_twinkly_loop1: info<number>(),

   /** number of times twinkly trapped you */
   neutral_twinkly_loop2: info<number>(),

   /**
    * neutral twinkly
    * ```md
    * 0 - not met yet
    * 1 - asgore killed
    * 2 - my world
    * 3 - fight begins
    * 3.1 - checkpoint 1 - patience phase
    * 3.2 - checkpoint 2 - bravery phase
    * 3.3 - checkpoint 3 - integrity phase
    * 3.4 - checkpoint 4 - perserverance phase
    * 3.5 - checkpoint 5 - kindness phase
    * 3.6 - checkpoint 6 - justice phase
    * 4 - fight ends
    * 5 - make your choice
    * 5.1 - made your choice
    * 6 - exited the outpost (balcony)
    * ```
    */
   neutral_twinkly_stage: info<0 | 1 | 2 | 3 | 3.1 | 3.2 | 3.3 | 3.4 | 3.5 | 3.6 | 4 | 5 | 5.1 | 6>(),

   // pacifist twinkly's memory
   pa_twinkly1: info<number>(),

   /**
    * pacifist progress marker
    * ```md
    * 0 - not triggered yet
    * 1 - you idiot
    * 2 - don't give up
    * 3 - i can't believe you're all so stupid
    * 4 - i was so tired of being a star
    * 5 - hopes and dreams
    * 6 - let's see what good your determination is against this
    * 7 - burn in despair
    * 7.1 - no hit 1
    * 7.2 - no hit 1 reaction
    * 7.3 - no hit 2
    * 7.4 - no hit 2 reaction
    * 7.5 - hit
    * 7.6 - final volley 1
    * 7.7 - final volley 2
    * 7.8 - final volley 3
    * 8 - SAVE the Galaxy
    * 9 - someone else
    * 9.1 - his theme
    * 9.2 - strong attack
    * 9.3 - weak attack
    * 9.4 - spare attack 1
    * 9.5 - spare attack 2
    * 9.6 - spare attack 3
    * 9.7 - spare attack 4
    * 9.8 - just let me win (buttons get destroyed)
    * 10 - final stage
    * 11 - i'm so sorry
    * 11.1 - i always was a crybaby, wasn't i
    * 11.2 - you tell asriel your name
    * 11.3 - i understand if you can't forgive me
    * 12 - forgive / do not
    * 13 - final power
    * 14 - the barrier was destroyed
    * 15 - comfort him / do not
    * 15.1 - you're going to do a great job
    * 15.2 - well, my time's running out
    * 15.3 - take care of mom and dad for me
    * 16 - the end
    * 16.1 - epilogue started
    * ```
    */
   pacifist_marker: info<
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6
      | 7
      | 7.1
      | 7.2
      | 7.3
      | 7.4
      | 7.5
      | 7.6
      | 7.7
      | 7.8
      | 8
      | 9
      | 9.1
      | 9.2
      | 9.3
      | 9.4
      | 9.5
      | 9.6
      | 9.7
      | 9.8
      | 10
      | 11
      | 11.1
      | 11.2
      | 11.3
      | 12
      | 13
      | 14
      | 15
      | 15.1
      | 15.2
      | 15.3
      | 16
      | 16.1
   >(),

   // random number generator base values (stored)
   pacifist_marker_base_attack: info<number>(),
   pacifist_marker_base_dialogue: info<number>(),
   pacifist_marker_base_pattern: info<number>(),

   /**
    * bully-save counter
    * 0 - no bullies yet
    * 1 - bullied 1
    * 2 - bullied 2
    * 3 - bullied 3
    * 4 - bully ending activated
    * 5 - hit 1
    * 6 - hit 2
    * 7 - hit 3
    * 8 - hit 4
    * 9 - hit 5
    * 10 - hit 6
    * 11 - hit 7
    */
   pacifist_marker_bully: info<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11>(),

   /** furthest hit progress */
   pacifist_marker_bully_hits: info<number>(),

   /** times you "equipped" the corn dog (stored) */
   pacifist_marker_corndogger: info<number>(),

   /** times "died" in asriel fight */
   pacifist_marker_gameover: info<number>(),

   /** times "refused" in asriel fight (text trigger) */
   pacifist_marker_gameover_refused: info<number>(),

   /** current hits taken */
   pacifist_marker_hits: info<number>(),

   /** current hp */
   pacifist_marker_hp: info<number>(),

   /** tablaphone post-turn HP restoration value */
   pacifist_marker_tabla_hp: info<number>(),

   /** turn count in asriel fight */
   pacifist_marker_turns: info<number>(),

   /** toriel flee post neutral counter */
   postnoot_exitfail: info<number>(),

   /**
    * twinkly's encounter state
    * ```md
    * 0 - has not hurt player yet
    * 1 - has hurt player
    * 1.5 - avoided pellets and reset
    * 2 - has hurt player and met them once again
    * 3 - has been burned by toriel
    * 4 - will not show up for some reason
    * ```
    */
   progress_twinkly: info<0 | 1 | 1.5 | 2 | 3 | 4>(),

   /**
    * state of toriel
    * ```md
    * 0 - not killed or spared
    * 1 - killed
    * 2 - killed, then spared
    * 3 - spared
    * 4 - spared, then killed
    * 5 - killed, then spared, then killed again
    * 6 - spared, then killed, then spared again
    * 7 - killed multiple times
    * 7.1 - killed multiple times (repeat dialogue 1)
    * 7.2 - killed multiple times (repeat dialogue 2)
    * 7.3 - killed multiple times (repeat dialogue 3)
    * 8 - spared multiple times
    * 8.1 - spared multiple times (repeat dialogue 1)
    * 8.2 - spared multiple times (repeat dialogue 2)
    * 8.3 - spared multiple times (repeat dialogue 3)
    * 9 - killed multi, then spared
    * 10 - spared multi, then killed
    * 11 - spared, then killed multi
    * 11.1 - spared, then killed multi (repeat dialogue 1)
    * 11.2 - spared, then killed multi (repeat dialogue 2)
    * 11.3 - spared, then killed multi (repeat dialogue 3)
    * 12 - killed, then spared multi
    * 12.1 - killed, then spared multi (repeat dialogue 1)
    * 12.2 - killed, then spared multi (repeat dialogue 2)
    * 12.3 - killed, then spared multi (repeat dialogue 3)
    * 13 - spared multi, then killed multi
    * 13.1 - spared multi, then killed multi (repeat dialogue 1)
    * 13.2 - spared multi, then killed multi (repeat dialogue 2)
    * 13.3 - spared multi, then killed multi (repeat dialogue 3)
    * 14 - killed multi, then spared multi
    * 14.1 - killed multi, then spared multi (repeat dialogue 1)
    * 14.2 - killed multi, then spared multi (repeat dialogue 2)
    * 14.3 - killed multi, then spared multi (repeat dialogue 3)
    * 15 - mix of outcomes
    * 15.1 - mix of outcomes (repeat dialogue 1)
    * 15.2 - mix of outcomes (repeat dialogue 2, twinkly gone)
    * ```
    */
   state_toriel: info<
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6
      | 7
      | 7.1
      | 7.2
      | 7.3
      | 8
      | 8.1
      | 8.2
      | 8.3
      | 9
      | 10
      | 11
      | 11.1
      | 11.2
      | 11.3
      | 12
      | 12.1
      | 12.2
      | 12.3
      | 13
      | 13.1
      | 13.2
      | 13.3
      | 14
      | 14.1
      | 14.2
      | 14.3
      | 15
      | 15.1
      | 15.2
   >(),

   /** number of times undyne the undying has appeared */
   undying: info<number>()
};

export const flagString = {
   // gamepad inputs
   $gamepad_input_z: info<string>(),
   $gamepad_input_x: info<string>(),
   $gamepad_input_c: info<string>(),
   $gamepad_input_u: info<string>(),
   $gamepad_input_l: info<string>(),
   $gamepad_input_d: info<string>(),
   $gamepad_input_r: info<string>(),
   $gamepad_input_f: info<string>(),

   // language
   $option_language: info<string>(native),

   // twinkly save file storage
   myworld: info<string>(),

   // inventory in asriel fight
   pacifist_marker_inventory: info<string>()
};

export const dataBooleanStore = createDataStore<OutertaleDataBoolean>('b', false, dataBoolean);
export const dataNumberStore = createDataStore<OutertaleDataNumber>('n', 0, dataNumber);
export const dataStringStore = createDataStore<OutertaleDataString>('s', '', dataString);
export const flagBooleanStore = createFlagStore<OutertaleFlagBoolean>('b', false, flagBoolean);
export const flagNumberStore = createFlagStore<OutertaleFlagNumber>('n', 0, flagNumber);
export const flagStringStore = createFlagStore<OutertaleFlagString>('s', '', flagString);

export const SAVE = {
   canon: 'SPACETIME',
   data: { b: dataBooleanStore, n: dataNumberStore, s: dataStringStore },
   flag: { b: flagBooleanStore, n: flagNumberStore, s: flagStringStore },
   hostages: {} as Partial<CosmosKeyed>,
   internal: {
      dirty: false,
      entries: [] as [string, string][],
      write () {
         backend?.writeSave(SAVE.serialize());
      }
   },
   isCanon () {
      return SAVE.namespace === SAVE.canon;
   },
   keys () {
      return CosmosUtils.populate(SAVE.manager.length, index => SAVE.manager.key(index)!);
   },
   manager: ((): Storage => {
      if (backend === null) {
         return localStorage;
      } else {
         return {
            clear () {
               SAVE.internal.entries.splice(0, SAVE.internal.entries.length);
               SAVE.internal.write();
            },
            getItem (key: string) {
               for (const item of SAVE.internal.entries) {
                  if (key === item[0]) {
                     return item[1];
                  }
               }
               return null;
            },
            key (index: number) {
               return SAVE.internal.entries[index]?.[0] ?? null;
            },
            get length () {
               return SAVE.internal.entries.length;
            },
            removeItem (key: string) {
               for (const [ index, item ] of SAVE.internal.entries.entries()) {
                  if (key === item[0]) {
                     SAVE.internal.entries.splice(index, 1);
                     SAVE.internal.write();
                     return;
                  }
               }
            },
            setItem (key: string, value: string) {
               for (const item of SAVE.internal.entries) {
                  if (key === item[0]) {
                     item[1] = value;
                     SAVE.internal.write();
                     return;
                  }
               }
               SAVE.internal.entries.push([ key, value ]);
               SAVE.internal.write();
            }
         };
      }
   })(),
   namespace: '',
   parse (content: string | null | void) {
      return CosmosUtils.parse<[string, any][]>(content, []).map(
         ([ key, value ]) =>
            [ key, typeof value === 'string' && !key.includes(':s') ? value : CosmosUtils.serialize(value) ] as [
               string,
               string
            ]
      );
   },
   ready: false,
   safespace: 'UNIVERSAL',
   save (state: CosmosKeyed | null = null) {
      SAVE.manager.setItem(SAVE.namespace, CosmosUtils.serialize(state ?? SAVE.state));
      for (const [ key, value ] of Object.entries(SAVE.hostages)) {
         value === null ? SAVE.manager.removeItem(key) : SAVE.manager.setItem(key, value!);
         delete SAVE.hostages[key];
      }
   },
   saveswap: false,
   serialize (beautify = false) {
      return CosmosUtils.serialize(
         SAVE.keys().map(key => [ key, CosmosUtils.parse(SAVE.manager.getItem(key) ?? '') ]),
         beautify
      );
   },
   state: {} as CosmosKeyed,
   storage: {
      inventory: new OutertaleInventory(8, dataStringStore, index => `inventory_${index}`),
      dimboxA: new OutertaleInventory(10, dataStringStore, index => `dimboxA_${index}`),
      dimboxB: new OutertaleInventory(10, dataStringStore, index => `dimboxB_${index}`)
   },
   strings (contents: string | null | void) {
      return CosmosUtils.parse<{ s?: Partial<OutertaleDataString> }>(contents, {}).s ?? {};
   },
   timelines: 'TIMELINES',
   transfer (target: Storage) {
      if (SAVE.manager !== target) {
         for (const key of SAVE.keys()) {
            target.setItem(key, SAVE.manager.getItem(key)!);
         }
         SAVE.manager = target;
      }
   }
};

SAVE.internal.entries.push(...SAVE.parse(backend?.data()));
SAVE.namespace = params.get('namespace') ?? SAVE.canon;

CosmosUtils.status(`LOAD MODULE: SAVE (${Math.floor(performance.now()) / 1000})`, { color: '#07f' });
