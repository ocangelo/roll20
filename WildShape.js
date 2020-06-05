/*

importing a monster from the MonsterManual:
- open the monster, make a copy, and download its avatar 
- re-add the image to the library
- set the image from the library as the copied monster avatar

*/

/*jshint -W069 */
/*jshint -W014 */

const WS_API = {
    NAME : "WildShape",
    VERSION : "1.0",
    STATENAME : "WILDSHAPE",
    DEBUG : false,

    // storage in the state
    DATA_CONFIG : "config",
    DATA_SHIFTERS : "shifters",

    // general info
    DEFAULTS : {
        BASE_SHAPE : "base",
        SHIFTER_SIZE : "normal",
        SHAPE_SIZE : "auto",
        ISDRUID : true,

        CONFIG : {
            SEP: "--",              // separator used in commands

            NPC_CURRHP: "npchp",

            TOKEN_DATA : {
                HP: "bar1",         // HP can never be empty, we are caching current value from bars on transforming
                AC: "bar2",
                SPEED: "bar3",

                EMPTYBAR: "none",
            },
        },
    },

    SHAPE_SIZES : [
        "auto",
        "normal",
        "large",
        "huge",
        "gargantuan",
    ],

    // available commands
    CMD : {
        ROOT : "!ws",
        USAGE : "Please select a token then run: !ws",

        HELP : "help",

        CONFIG : "config",
        ADD : "add",
        REMOVE : "remove",
        EDIT : "edit",
        RESET : "reset",
        IMPORT : "import",
        EXPORT : "export",

        SHIFT : "shift",

        SHOW_SHIFTERS : "showshifters",
    },

    // fields that can be changed by commands
    FIELDS : {
        // target of a command
        TARGET : {
            CONFIG: "config",
            SHIFTER : "shifter",
            SHAPE : "shape",
            SHAPEFOLDER : "shapefolder",
        },

        SETTINGS: "settings",
        SHAPES: "shapes",

        ID: "ID",
        NAME: "name",
        CHARACTER: "character",
        SIZE: "size",
        ISDRUID: "isdruid",
        ISNPC: "isnpc",
        CURRENT_SHAPE: "currshape",

        SEP: "sep",

        TOKEN_DATA : {
            ROOT: "tokendata",
            HP: "HP",
            AC: "AC",
            SPEED: "SPEED",
        }
    }
};

class WildShapeMenu extends WildMenu
{
    constructor() {
        super();
        this.UTILS = new WildUtils(WS_API.NAME);
        this.SHAPE_SIZES = WS_API.SHAPE_SIZES.join("|");

        this.updateConfig();
    }

    updateConfig()
    {
        this.SEP = state[WS_API.STATENAME][WS_API.DATA_CONFIG].SEP;
        this.CMD = {};
        this.CMD.ROOT            = WS_API.CMD.ROOT + this.SEP;
        this.CMD.CONFIG          = this.CMD.ROOT + WS_API.CMD.CONFIG;
        this.CMD.CONFIG_ADD      = this.CMD.CONFIG + this.SEP + WS_API.CMD.ADD + this.SEP;
        this.CMD.CONFIG_REMOVE   = this.CMD.CONFIG + this.SEP + WS_API.CMD.REMOVE + this.SEP;
        this.CMD.CONFIG_EDIT     = this.CMD.CONFIG + this.SEP + WS_API.CMD.EDIT + this.SEP;
        this.CMD.CONFIG_RESET    = this.CMD.CONFIG + this.SEP + WS_API.CMD.RESET;
    }

    showEditShape(shifterId, shapeId) {
        const cmdShapeEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHAPE + this.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHIFTER + this.SEP;

        const shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterId];

        let npcs = this.UTILS.getNPCNames().sort().join('|');

        let obj = shifter[WS_API.FIELDS.SHAPES][shapeId];
        let listItems = [];
        if(obj)
        {
            listItems.push(this.makeListLabelValue("Name", shapeId) + this.makeListButton("Edit", cmdShapeEdit + shifterId + this.SEP + shapeId + this.SEP + WS_API.FIELDS.NAME + this.SEP + "?{Edit Name|" + shapeId + "}"));
            listItems.push(this.makeListLabelValue("Character", obj[WS_API.FIELDS.CHARACTER]) + this.makeListButton("Edit", cmdShapeEdit + shifterId + this.SEP + shapeId + this.SEP + WS_API.FIELDS.CHARACTER + this.SEP + "?{Edit Character|" + npcs + "}"));
            listItems.push(this.makeListLabelValue("Size", obj[WS_API.FIELDS.SIZE]) + this.makeListButton("Edit", cmdShapeEdit + shifterId + this.SEP + shapeId + this.SEP + WS_API.FIELDS.SIZE + this.SEP + "?{Edit Size|" + this["SHAPE_SIZES"] + "}"));
        }

        const deleteShapeButton = this.makeButton("Delete Shape", cmdRemove + "?{Are you sure?|no|yes}" + this.SEP + WS_API.FIELDS.TARGET.SHAPE + this.SEP + shifterId + this.SEP + shapeId, ' width: 100%');
        const editShifterButton = this.makeButton("Edit Shifter: " + shifterId, cmdShifterEdit + shifterId, ' width: 100%');

        let contents = this.makeList(listItems) + '<hr>' + deleteShapeButton + '<hr>' + editShifterButton;
        this.showMenu(WS_API.NAME, contents, WS_API.NAME + ': ' + shifterId + " - " + shapeId);
    }

    showEditShifter(shifterId) {
        const cmdShapeEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHAPE + this.SEP;
        const cmdShapeAdd = this.CMD.CONFIG_ADD + WS_API.FIELDS.TARGET.SHAPE + this.SEP;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHIFTER + this.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;
        const cmdImport = this.CMD.CONFIG + this.SEP + WS_API.CMD.IMPORT + this.SEP;
        const cmdExport = this.CMD.CONFIG + this.SEP + WS_API.CMD.EXPORT + this.SEP;

        const shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterId];
        const shifterSettings = shifter[WS_API.FIELDS.SETTINGS];
        const shifterShapes = shifter[WS_API.FIELDS.SHAPES];

        // get list of pcs and npcs
        const npcs = this.UTILS.getNPCNames().sort().join('|');
        const pcs = this.UTILS.getPCNames().sort().join('|');
        let shifterPcs;
        if (shifterSettings[WS_API.FIELDS.ISNPC])
            shifterPcs = npcs;
        else 
            shifterPcs = pcs;

        let pcTag = shifterSettings[WS_API.FIELDS.ISNPC] ? "<i>(NPC)</i>" : " <i>(PC)</i>";

        // settings section
        let listItems = [];
        listItems.push(this.makeListLabel("<p style='font-size: 120%'><b>Settings " + pcTag) + ":</b></p>");
        listItems.push(this.makeListLabel("Token name needs to match to be able to shapeshift", "font-size: 80%; padding-left: 10px; padding-bottom: 10px"));

        let listSettings = [];
        {
            listSettings.push(this.makeListLabelValue("Token Name", shifterId) + this.makeListButton("Edit", cmdShifterEdit + shifterId + this.SEP + WS_API.FIELDS.NAME + this.SEP + "&#64;{target|token_name}"));// + "?{Edit Name|" + shifterId + "}"));
            listSettings.push(this.makeListLabelValue(pcTag + " Character", shifterSettings[WS_API.FIELDS.CHARACTER]) + this.makeListButton("Edit", cmdShifterEdit + shifterId + this.SEP + WS_API.FIELDS.CHARACTER + this.SEP + "?{Edit Character|" + shifterPcs + "}"));
            listSettings.push(this.makeListLabelValue("Size", shifterSettings[WS_API.FIELDS.SIZE]) + this.makeListButton("Edit", cmdShifterEdit + shifterId + this.SEP + WS_API.FIELDS.SIZE + this.SEP + "?{Edit Size|" + this["SHAPE_SIZES"] + "}"));
            listSettings.push(this.makeListLabelValue("Is Druid", shifterSettings[WS_API.FIELDS.ISDRUID], 'false') + this.makeListButton("Toggle", cmdShifterEdit + shifterId + this.SEP + WS_API.FIELDS.ISDRUID));
            listSettings.push(this.makeListLabel("Is Druid automatically copies over INT/WIS/CHA attributes", "font-size: 80%"));
        }
        listItems.push(this.makeList(listSettings, " padding-left: 10px"));

        // shapes section
        listItems.push(this.makeListLabel("<p style='font-size: 120%'><b>Shapes:</b></p>") + this.makeListButton("Add PC", cmdShapeAdd + shifterId + this.SEP + "?{Target Shape|" + pcs + "}" + this.SEP + "?{Simple Name (optional)}") + this.makeListButton("Add NPC", cmdShapeAdd + shifterId + this.SEP + "?{Target Shape|" + npcs + "}" + this.SEP + "?{Simple Name (optional)}") );
        let listShapes = [];
        {
            _.each(shifterShapes, (value, shapeId) =>
            {
                listShapes.push(this.makeListLabel(shapeId) + this.makeListButton("Del", cmdRemove + "?{Are you sure?|no|yes}" + this.SEP + WS_API.FIELDS.TARGET.SHAPE + this.SEP + shifterId + this.SEP + shapeId) + this.makeListButton("Edit", cmdShapeEdit + shifterId + this.SEP + shapeId));
            });
        }
        listItems.push(this.makeList(listShapes, " padding-left: 10px"));

        // bottom buttons
        const importShapesFromFolderButton = this.makeButton("Import Shapes from Folder", cmdImport + WS_API.FIELDS.TARGET.SHAPEFOLDER + this.SEP + shifterId + this.SEP + "?{Folder Name}" + this.SEP + "?{Find in Subfolders?|no|yes}" + this.SEP + "?{Remove Prefix (optional)}" + this.SEP + "?{Add Prefix (optional)}" + this.SEP + "?{Add Prefix to Simple Name?|no|yes}", ' width: 100%');
        //const importShapesButton = this.makeButton("Import Shapes", cmdImport + WS_API.FIELDS.TARGET.SHAPE + this.SEP + "?{Shapes Data}", ' width: 100%');
        //const exportShapesButton = this.makeButton("Export Shapes", cmdExport + WS_API.FIELDS.TARGET.SHAPE, ' width: 100%');
        //const exportShifterButton = this.makeButton("Export Shifter", cmdExport + WS_API.FIELDS.TARGET.SHIFTER, ' width: 100%');
        const deleteShifterButton = this.makeButton("Delete: " + shifterId, cmdRemove + "?{Are you sure?|no|yes}" + this.SEP + WS_API.FIELDS.TARGET.SHIFTER + this.SEP + shifterId, ' width: 100%');
        const showShiftersButton = this.makeButton("Show ShapeShifters", this.CMD.ROOT + WS_API.CMD.SHOW_SHIFTERS, ' width: 100%');

        let contents = this.makeList(listItems) + importShapesFromFolderButton /*+ importShapesButton + exportShapesButton + exportShifterButton*/ + '<hr>' + deleteShifterButton + '<hr>' + showShiftersButton;
        this.showMenu(WS_API.NAME, contents, WS_API.NAME + ': ' + shifterId);
    }

    showShifters() {
        const cmdShifterAdd = this.CMD.CONFIG_ADD + WS_API.FIELDS.TARGET.SHIFTER + this.SEP;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHIFTER + this.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;
        const cmdImport = this.CMD.CONFIG + this.SEP + WS_API.CMD.IMPORT + this.SEP;

        let listItems = [];
        _.each(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS], (value, shifterId) => {
            const shifterSettings = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterId][WS_API.FIELDS.SETTINGS];
            listItems.push(this.makeListLabel(shifterId + (shifterSettings[WS_API.FIELDS.ISNPC] ? " <i>(NPC)</i>" : " <i>(PC)</i>")) + this.makeListButton("Del", cmdRemove + "?{Are you sure?|no|yes}" + this.SEP + WS_API.FIELDS.TARGET.SHIFTER + this.SEP + shifterId)+ this.makeListButton("Edit", cmdShifterEdit + shifterId));
        });

        let pcs = this.UTILS.getPCNames().sort().join('|');
        let npcs = this.UTILS.getNPCNames().sort().join('|');

        const addShifterButton = this.makeButton("Add ShapeShifter", cmdShifterAdd + "&#64;{target|token_id}", ' width: 100%');
        //const importShifterButton = this.makeButton("Import Shifter", cmdImport + WS_API.FIELDS.TARGET.SHIFTER + this.SEP + "?{Shifter Data}", ' width: 100%');

        const configButton = this.makeButton("Main Menu", this.CMD.CONFIG, ' width: 100%');

        let contents = this.makeList(listItems) + addShifterButton /*+ importShifterButton*/ + '<hr>' + configButton;
        this.showMenu(WS_API.NAME, contents, WS_API.NAME + ': ShapeShifters');
    }

    showConfigMenu(first) {
        const config = state[WS_API.STATENAME][WS_API.DATA_CONFIG];

        const apiCmdBase = this.CMD.ROOT;
        const cmdConfigEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.CONFIG + this.SEP;

        const showShiftersButton = this.makeButton("Edit ShapeShifters", apiCmdBase + WS_API.CMD.SHOW_SHIFTERS, ' width: 100%');

        let tokenDataList = [
            this.makeListLabel("<p style='font-size: 120%'><b>Token Data:</b></p>"),
            this.makeListLabel("Automatically assign values to bars (HP needs to be assigned to one)", "font-size: 80%; padding-left: 10px; padding-bottom: 10px"),

            this.makeList(
                [ 
                    this.makeListLabelValue("HP", config.TOKEN_DATA.HP) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.TOKEN_DATA.ROOT + this.SEP + WS_API.FIELDS.TOKEN_DATA.HP + this.SEP + "?{Select a Bar|bar1|bar2|bar3}"),
                    this.makeListLabelValue("AC", config.TOKEN_DATA.AC) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.TOKEN_DATA.ROOT + this.SEP + WS_API.FIELDS.TOKEN_DATA.AC + this.SEP + "?{Select a Bar|none|bar1|bar2|bar3}"),
                    this.makeListLabelValue("SPEED", config.TOKEN_DATA.SPEED) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.TOKEN_DATA.ROOT + this.SEP + WS_API.FIELDS.TOKEN_DATA.SPEED + this.SEP + "?{Select a Bar|none|bar1|bar2|bar3}"),
                ], " padding-left: 10px"),
        ];

        let otherSettingsList = [
            this.makeListLabelValue("Commands Separator", this.SEP) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.SEP + this.SEP + "?{New Separator}"),
            this.makeListLabel("Please make sure your names/strings don't include the separator used by the API", "font-size: 80%"),
        ];

          
        //const importButton = this.makeButton('Import Config', this.CMD.CONFIG + this.SEP + WS_API.CMD.IMPORT + this.SEP + '?{Config}', ' width: 100%');
        const resetButton = this.makeButton('Reset Config', this.CMD.CONFIG_RESET, ' width: 100%');

        let title_text = WS_API.NAME + " v" + WS_API.VERSION + ((first) ? ': First Time Setup' : ': Config');
        let contents = showShiftersButton
                        + '<hr>' + this.makeList(tokenDataList)
                        + '<hr>' + this.makeList(otherSettingsList)
                        + '<hr>' + resetButton;

        this.showMenu(WS_API.NAME, contents, title_text);
    }

    showShapeShiftMenu(who, playerid, shifterId, shapes) {
        const cmdShapeShift = this.CMD.ROOT + WS_API.CMD.SHIFT + this.SEP + shifterId + this.SEP;

        let contents = '';

        if (playerIsGM(playerid))
        {
            const cmdShifterEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHIFTER + this.SEP;
            contents += this.makeButton("Edit", cmdShifterEdit + shifterId, ' width: 100%') + "<hr>";
        }

        contents += this.makeButton(shifterId, cmdShapeShift + WS_API.DEFAULTS.BASE_SHAPE, ' width: 100%') + "<hr>";
        _.each(shapes, (value, key) => {
            contents += this.makeButton(key, cmdShapeShift + key, ' width: 100%');
        });

        this.showMenu(WS_API.NAME, contents, WS_API.NAME + ': ' + shifterId + ' ShapeShift', {whisper: who});
    }
}


var WildShape = WildShape || (function() {
    'use strict';
    let MENU = new WildShapeMenu();
    let UTILS = new WildUtils(WS_API.NAME);

    const sortShifters = () => {
        // order shifters
        state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] = UTILS.sortByKey(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS]);
    };

    const sortShapes = (shifter) => {
        // order shapes
        shifter[WS_API.FIELDS.SHAPES] = UTILS.sortByKey(shifter[WS_API.FIELDS.SHAPES]);
    };

    const getCreatureSize = (targetSize) => {        
        return targetSize ? Math.max(_.indexOf(WS_API.SHAPE_SIZES, targetSize.toLowerCase()), 0) : 0;
    };

    const findShifter = (selectedToken) => {
        let tokenObj = getObj(selectedToken._type, selectedToken._id);
        
        //const id = tokenObj.get("represents");
        //const targetId = _.findKey(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS], function(s) { return s[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] == id; });
        //if (targetKey)

        const targetId = tokenObj.get("name");
        const target = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][targetId];

        if(target)
        {
            const targetCharacterId = target[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID];
            const targetCharacter = findObjs({ type: 'character', id: targetCharacterId })[0];
            if(targetCharacter)
            {
                return {
                    token: tokenObj,
                    shifterId: targetId,
                    shifter: target,
                    shifterCharacterId: targetCharacterId,
                    shifterCharacter: targetCharacter,
                    shifterControlledby: targetCharacter.get("controlledby")
                };
            }
            else
                UTILS.chatError("Cannot find ShapeShifter: " + targetId + ", character id: " + target[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID]);
        }
        else
            UTILS.chatError("Cannot find ShapeShifter: " + targetId);

        return null;
    };

    const getCharacterData = (shiftData, isNpc, isDefault) =>
    {
        const shifterSettings = shiftData.shifter[WS_API.FIELDS.SETTINGS];

        let data = {};
        
        let targetImg = null;
        let targetSize = 1;

        let hpName = "hp";
        let acName;
        let speedName;
        
        if(isNpc)
        {
            acName = "npc_ac";    
            speedName = "npc_speed";

            targetImg = UTILS.getCleanImgsrc(shiftData.targetCharacter.get('avatar'));
            if (targetImg === undefined)
            {
                UTILS.chatErrorToPlayer(shiftData.who, "the NPC avatar needs to be re-uploaded into the library and set on the target character; cannot use marketplace link");
                return null;
            }
            
            const targetData = shiftData.targetShape ? shiftData.targetShape : shifterSettings;
            targetSize =  getCreatureSize(targetData[WS_API.FIELDS.SIZE]);
            if (targetSize === 0)
            {
                targetSize = getAttrByName(shiftData.targetCharacterId, "token_size");
                if(!targetSize)
                    targetSize = 1;
            }
        }
        else
        {
            acName = "ac";    
            speedName = "speed";

            shiftData.targetCharacter.get('_defaulttoken', function(defaulttoken) {
                const dt = JSON.parse(defaulttoken);
                if (dt)
                    targetImg = UTILS.getCleanImgsrc(dt.imgsrc);
            });
            if (!targetImg)
            {
                targetImg = UTILS.getCleanImgsrc(shiftData.targetCharacter.get('avatar'));

                if (!targetImg)
                {
                    UTILS.chatErrorToPlayer(shiftData.who, "cannot find token or avatar image for PC " + shiftData.targetCharacterId);
                    return null;
                }
            }

            targetSize = getCreatureSize(shifterSettings[WS_API.FIELDS.SIZE]);
            
            // auto defaults to normal on PCs
            if (targetSize == 0)
                targetSize = 1;
        }

        let hpObj = findObjs({type: "attribute", characterid: shiftData.targetCharacterId, name: hpName})[0];
        let acObj = findObjs({type: "attribute", characterid: shiftData.targetCharacterId, name: acName})[0];
        let speedObj = findObjs({type: "attribute", characterid: shiftData.targetCharacterId, name: speedName})[0];
        
        data.hp             = {};
        data.hp.current     = hpObj.get('current');
        data.hp.max         = hpObj.get('max');
        data.hp.id          = hpObj.id;

        data.ac             = {};
        data.ac.current     = acObj.get('current');
        data.ac.max         = acObj.get('max');
        data.ac.id          = acObj.id;

        data.speed          = {};
        data.speed.current  = speedObj.get('current');
        data.speed.max      = speedObj.get('max');
        data.speed.id       = speedObj.id;

        data.imgsrc = targetImg;
	    data.characterId = shiftData.targetCharacterId;
        data.controlledby = shiftData.shifterControlledby;
        data.tokenSize = targetSize;

        // special handling of NPC ShapeShifter to restore hp when going back to original form, as they don't store the current in hp
        if(shifterSettings[WS_API.FIELDS.ISNPC])
        {
            const config = state[WS_API.STATENAME][WS_API.DATA_CONFIG];

            if (isDefault)
            {
                if (shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] != WS_API.DEFAULTS.BASE_SHAPE)
                {
                    data.hp.current = shifterSettings[config.NPC_CURRHP];
                }
                else
                    return null;
            }
            else if (shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] == WS_API.DEFAULTS.BASE_SHAPE)
            {
                // cache current npc hp value
                shifterSettings[config.NPC_CURRHP] = shiftData.token.get(config.TOKEN_DATA.HP + "_value");
            }                
        }

        return data;
    };

    const copyDruidData = (fromId, toId) => {
        const copyAttrNames = ["intelligence", "wisdom", "charisma"];
        const copyAttrVariations = ["", "_base", "_mod", "_save_bonus"];

        _.each(copyAttrNames, function (attrName) {
            _.each(copyAttrVariations, function (attrVar) {
                UTILS.copyAttribute(fromId, toId, attrName + attrVar, "", "", false);
            });
        });

        /* copy skill proficiencies?
                //npc_saving_flag: 1
                // npc_str/dex/con/wis/int/cha_save + _flag

                copyAttrNames = ["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", 
                                 "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"];
                copyAttrVariations = ["_prof"]
                _.each(copyAttrNames, function (attrName) {
                    _.each(copyAttrVariations, function (attrVar) {
                        copyDruidAttribute(targetCharacterId, attrName + attrVar);
                    });
                });
        */
    };

    const doShapeShift = (shiftData) => {
        const shifterSettings = shiftData.shifter[WS_API.FIELDS.SETTINGS];

        let isTargetNpc = true;
        let isTargetDefault = false;

        if(shiftData.targetShape)
        {
            shiftData.targetCharacterId = shiftData.targetShape[WS_API.FIELDS.ID];
            shiftData.targetCharacter = findObjs({ type: 'character', id: shiftData.targetCharacterId })[0];
            if (!shiftData.targetCharacter)
            {
                UTILS.chatErrorToPlayer(shiftData.who, "Cannot find target character = " + shiftData.targetShape[WS_API.FIELDS.CHARACTER] + " with id = " + shiftData.targetCharacterId);
                return false;
            }

            isTargetNpc = (getAttrByName(shiftData.targetCharacterId, 'npc', 'current') == 1);
        }
        else
        {
            // transform back into default shifter character
            shiftData.targetCharacterId = shifterSettings[WS_API.FIELDS.ID];
            shiftData.targetCharacter = shiftData.shifterCharacter;  
            isTargetNpc = shifterSettings[WS_API.FIELDS.ISNPC];
            isTargetDefault = true;
        }
        const targetData = getCharacterData(shiftData, isTargetNpc, isTargetDefault);
        if (!targetData)
            return false;

        if (WS_API.DEBUG)
        {
            UTILS.chat("====== TARGET STATS ======");
            UTILS.chat("token_size = " + targetData.tokenSize);
            UTILS.chat("controlledby = " + targetData.controlledby);
            UTILS.chat("avatar = " + targetData.imgsrc);
            UTILS.chat("hp = " + targetData.hp.current);
            UTILS.chat("ac = " + targetData.ac.current);
            UTILS.chat("npc speed = " + targetData.speed.current);
        }

        const config = state[WS_API.STATENAME][WS_API.DATA_CONFIG];

        if (isTargetNpc)
        {
            if (shifterSettings[WS_API.FIELDS.ISDRUID])
            {
                copyDruidData(shifterSettings[WS_API.FIELDS.ID], shiftData.targetCharacterId);
            }

            if (config.TOKEN_DATA.AC != config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set(config.TOKEN_DATA.AC + "_link", 'None');
                shiftData.token.set(config.TOKEN_DATA.AC + "_value", targetData.ac.current);
            }

            if (config.TOKEN_DATA.SPEED != config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set(config.TOKEN_DATA.SPEED + "_link", 'None');
                shiftData.token.set(config.TOKEN_DATA.SPEED + "_value", targetData.speed.current.split(' ')[0]);
            }

            // set HP last in case we need to override another value because of wrong data
            shiftData.token.set(config.TOKEN_DATA.HP + "_link", 'None');
            shiftData.token.set(config.TOKEN_DATA.HP + "_value", isTargetDefault ? targetData.hp.current : targetData.hp.max);
            shiftData.token.set(config.TOKEN_DATA.HP + "_max", targetData.hp.max);
        }
        else
        {
            if (config.TOKEN_DATA.AC != config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set(config.TOKEN_DATA.AC + "_link", isTargetDefault ? targetData.ac.id : 'None');
                shiftData.token.set(config.TOKEN_DATA.AC + "_value", targetData.ac.current);
            }

            if (config.TOKEN_DATA.SPEED != config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set(config.TOKEN_DATA.SPEED + "_link", targetData.speed.id);
                shiftData.token.set(config.TOKEN_DATA.SPEED + "_value", targetData.speed.current);
            }

            // set HP last in case we need to override another value because of wrong data
            shiftData.token.set(config.TOKEN_DATA.HP + "_link", isTargetDefault ? targetData.hp.id : 'None');
            shiftData.token.set(config.TOKEN_DATA.HP + "_value", isTargetDefault ? targetData.hp.current : targetData.hp.max);
            shiftData.token.set(config.TOKEN_DATA.HP + "_max", targetData.hp.max);
        }
        
        shiftData.token.set({
            imgsrc: targetData.imgsrc,
            represents: targetData.characterId,
            height: 70 * targetData.tokenSize,
            width: 70 * targetData.tokenSize,
        });

        if (!isTargetDefault)
        {
            shiftData.targetCharacter.set({controlledby: targetData.controlledby, inplayerjournals: targetData.controlledby});
        }

        shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] = shiftData.targetShapeName;
        
        return true;
    };

    const addShapeToShifter = (shifter, shapeCharacter, shapeId = null, doSort = true) => {
        const shapeName = shapeCharacter.get('name');
        if ((!shapeId) || (typeof shapeId !== 'string') || (shapeId.length == 0))
            shapeId = shapeName;

        if (shifter[WS_API.FIELDS.SHAPES][shapeId])
        {
            UTILS.chatError("Trying to add a shape with an ID that's already used, skipping: " + shapeId);
            return false;
        }

        let shape = {};
        shape[WS_API.FIELDS.ID] = shapeCharacter.get('id');
        shape[WS_API.FIELDS.CHARACTER] = shapeName;
        shape[WS_API.FIELDS.SIZE] = WS_API.DEFAULTS.SHAPE_SIZE;


        shifter[WS_API.FIELDS.SHAPES][shapeId] = shape;

        const shifterCharacter = findObjs({ type: 'character', id: shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] })[0];
        if (shifterCharacter)
        {
            const shifterControlledBy = shifterCharacter.get("controlledby");
            shapeCharacter.set({controlledby: shifterControlledBy, inplayerjournals: shifterControlledBy});
        }

        if (doSort)
        {
            sortShapes(shifter);
        }

        return true;
    };

    const handleInput = (msg) => {
        if (msg.type === "api")
        {
            if (msg.content.indexOf(WS_API.CMD.ROOT) == 0)
            {
                let config = state[WS_API.STATENAME][WS_API.DATA_CONFIG];
                const args = msg.content.split(config.SEP);
                args.shift(); // remove WS_API.CMD.ROOT
                if(args.length == 0)
                {
                    if (!msg.selected)
                    {
                        if (playerIsGM(msg.playerid))
                        {
                            MENU.showConfigMenu();
                        }
                        else
                        {
                            UTILS.chatToPlayer(msg.who, WS_API.CMD.USAGE);
                        }
                        return;
                    }

                    const obj = findShifter(msg.selected[0]);
                    if (obj)
                    {
                        if (playerIsGM(msg.playerid) || obj.shifterControlledby.search(msg.playerid) >= 0 || obj.shifterControlledby.search("all") >= 0)
                        {
                            MENU.showShapeShiftMenu(msg.who, msg.playerid, obj.shifterId, obj.shifter[WS_API.FIELDS.SHAPES]);
                        }
                        else
                        {
                            UTILS.chatErrorToPlayer(msg.who, "Trying to shapeshift on a token you don't have control over");
                        }
                    }
                    else {
                        UTILS.chatErrorToPlayer(msg.who, "Cannot find ShapeShifter for the selected token");
                    }
                    return;
                }
                else 
                {
                    let cmd = args.shift();

                    if (cmd == WS_API.CMD.SHIFT)
                    {
                        const shifterName = args.shift();
                        const shapeName = args.shift();

                        let shape = null;

                        const obj = findShifter(msg.selected[0]);
                        if(obj)
                        {
                            if (playerIsGM(msg.playerid) || obj.shifterControlledby.search(msg.playerid) >= 0 || obj.shifterControlledby.search("all") >= 0)
                            {
                                obj.who = msg.who;
                                obj.targetShapeName = shapeName.toLowerCase();

                                if (obj.targetShapeName != WS_API.DEFAULTS.BASE_SHAPE)
                                {
                                    if (obj.targetShapeName !== obj.shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.CURRENT_SHAPE])
                                    {
                                        const shape = obj.shifter[WS_API.FIELDS.SHAPES][shapeName];
                                        if (shape)
                                        {
                                            obj.targetShape = shape;
                                            if (doShapeShift(obj))
                                            {
                                                UTILS.chatAs(obj.shifterCharacter.get("id"), "Transforming into " + shapeName, null, null);
                                            }
                                        }
                                        else
                                        {
                                            UTILS.chatErrorToPlayer(msg.who, "Cannot find shape " + shapeName + " for ShapeShifter: " + obj.shifterId);
                                        }
                                    }
                                    else
                                    {
                                        UTILS.chatErrorToPlayer(msg.who, "You are already transformed into " + shapeName);
                                    }
                                }
                                else
                                {
                                    if (doShapeShift(obj))
                                        UTILS.chatAs(obj.shifterCharacter.get("id"), "Transforming back into " + obj.shifterId, null, null);
                                }   
                            }
                            else
                            {
                                UTILS.chatToPlayer(msg.who, "Trying to shapeshift on a token you don't have control over");
                            }
                        }
                    }
                    else if (playerIsGM(msg.playerid))
                    {
                        switch (cmd)
                        {
                            case WS_API.CMD.SHOW_SHIFTERS:
                            {
                                MENU.showShifters();
                            }
                            break;

                            case WS_API.CMD.CONFIG:
                            {
                                switch (args.shift())
                                {
                                    case WS_API.CMD.ADD:
                                    {
                                        switch (args.shift())
                                        {
                                            case WS_API.FIELDS.TARGET.SHIFTER:
                                            {
                                                let tokenId = args.shift();
                                                let tokenObj = findObjs({type:'graphic', id:tokenId})[0];                                                
                                                const shifterKey = tokenObj ? tokenObj.get("name") : null;
                                                if (shifterKey && shifterKey.length > 0)
                                                {
                                                    let shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
                                                    if(!shifter)
                                                    {
                                                        const charId = tokenObj.get("represents");
                                                        let charObj = findObjs({ type: 'character', id: charId });
                                                        if(charObj && charObj.length == 1)
                                                        {
                                                            const isNpc = (getAttrByName(charId, 'npc', 'current') == 1);

                                                            shifter = {};
                                                            
                                                            let shifterSettings = {};
                                                            shifterSettings[WS_API.FIELDS.ID] = charId;
                                                            shifterSettings[WS_API.FIELDS.CHARACTER] = charObj[0].get('name');
                                                            shifterSettings[WS_API.FIELDS.SIZE] = isNpc ? WS_API.DEFAULTS.SHAPE_SIZE : WS_API.DEFAULTS.SHIFTER_SIZE;
                                                            shifterSettings[WS_API.FIELDS.ISDRUID] = !isNpc;
                                                            shifterSettings[WS_API.FIELDS.ISNPC] = isNpc;
                                                            shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] = WS_API.DEFAULTS.BASE_SHAPE;

                                                            shifter[WS_API.FIELDS.SETTINGS] = shifterSettings;
                                                            shifter[WS_API.FIELDS.SHAPES] = {};

                                                            state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey] = shifter;

                                                            sortShifters();
                                                            MENU.showEditShifter(shifterKey);
                                                        }
                                                        else
                                                        {
                                                            UTILS.chatError("Cannot find character with id [" + charId + "] in the journal");
                                                        }

                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to add ShapeShifter " + shifterKey + " which already exists");
                                                    }
                                                }
                                                else
                                                {
                                                    UTILS.chatError("Trying to add ShapeShifter without a name");
                                                }
                                            }
                                            break;

                                            case WS_API.FIELDS.TARGET.SHAPE:
                                            {
                                                const shifterKey = args.shift();
                                                const shapeName = args.shift();
                                                let shapeKey = args.shift().trim();
                                                if (shapeName && shapeName.length > 0)
                                                {
                                                    let shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
                                                    if (shifter)
                                                    {
                                                        let shapeObj = findObjs({ type: 'character', name: shapeName });
                                                        if(shapeObj && shapeObj.length == 1)
                                                        {
                                                            if(addShapeToShifter(shifter, shapeObj[0], shapeKey))
                                                                MENU.showEditShifter(shifterKey);
                                                        }
                                                        else
                                                        {
                                                            UTILS.chatError("Cannot find character [" + shapeName + "] in the journal");
                                                        }
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to add shape to ShapeShifter " + shifterKey + " which doesn't exist");
                                                        MENU.showShifters();
                                                    }
                                                }
                                            }
                                            break;
                                        }
                                    }                                
                                    break;

                                    case WS_API.CMD.REMOVE:
                                    {
                                        if (args.shift() == 'no')
                                            return;

                                        switch (args.shift())
                                        {
                                            case WS_API.FIELDS.TARGET.SHIFTER:
                                            {
                                                const shifterKey = args.shift();
                                                if (shifterKey)
                                                {
                                                    if(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey])
                                                    {
                                                        let shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
                                                        _.each(shifter[WS_API.FIELDS.SHAPES], (shape) => {
                                                            if (shape)
                                                            {
                                                                const shapeCharacter = findObjs({ type: 'character', id: shape[WS_API.FIELDS.ID] })[0];
                                                                if (shapeCharacter)
                                                                {
                                                                    shapeCharacter.set({controlledby: "", inplayerjournals: ""});
                                                                }
                                                            }
                                                        });

                                                        delete state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to delete ShapeShifter " + shifterKey + " which doesn't exists");
                                                    }

                                                }
                                                else
                                                {
                                                    UTILS.chatError("Trying to delete a ShapeShifter without providing a name");
                                                }

                                                MENU.showShifters();
                                            }
                                            break;

                                            case WS_API.FIELDS.TARGET.SHAPE:
                                            {
                                                const shifterKey = args.shift();
                                                const shapeKey = args.shift();
                                                let shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
                                                if (shifter) 
                                                {
                                                    let shape = shifter[WS_API.FIELDS.SHAPES][shapeKey];
                                                    if (shape)
                                                    {
                                                        const shapeCharacter = findObjs({ type: 'character', id: shape[WS_API.FIELDS.ID] })[0];
                                                        if (shapeCharacter)
                                                        {
                                                            shapeCharacter.set({controlledby: "", inplayerjournals: ""});
                                                        }

                                                        delete shifter[WS_API.FIELDS.SHAPES][shapeKey];
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to remove shape " + shapeKey + " that doesn't exist from ShapeShifter " + shifterKey);
                                                    }

                                                    MENU.showEditShifter(shifterKey);
                                                }
                                                else
                                                {
                                                    UTILS.chatError("Trying to remove shape from ShapeShifter " + shifterKey + " which doesn't exist");
                                                    MENU.showShifters();
                                                }
                                            }
                                            break;
                                        }
                                    }
                                    break;

                                    case WS_API.CMD.EDIT:
                                    {
                                        switch (args.shift())
                                        {
                                            case WS_API.FIELDS.TARGET.SHIFTER:
                                            {
                                                let shifterKey = args.shift();
                                                let shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
                                                if (shifter)
                                                {
                                                    const field = args.shift();
                                                    if (field)
                                                    {
                                                        let isValueSet = false;
                                                        let newValue = args.shift();
                                                        if(field == WS_API.FIELDS.NAME)
                                                        {
                                                            let oldShifterKey = shifterKey; 
                                                            shifterKey = newValue.trim();

                                                            if (shifterKey && shifterKey.length > 0)
                                                            {
                                                                if(!state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey])
                                                                {
                                                                    state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey] = shifter;
                                                                    delete state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][oldShifterKey];
                                                                    sortShifters();
                                                                    isValueSet = true;
                                                                }
                                                                else
                                                                {
                                                                    UTILS.chatError("Trying to add ShapeShifter " + shifterKey + " which already exists");
                                                                }
                                                            }
                                                        }
                                                        else if(field == WS_API.FIELDS.CHARACTER)
                                                        {
                                                            let charObj = findObjs({ type: 'character', name: newValue });
                                                            if(charObj && charObj.length == 1)
                                                            {
                                                                shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] = charObj[0].get('id');
                                                                shifter[WS_API.FIELDS.SETTINGS][field] = newValue;
                                                                isValueSet = true;

                                                                const shifterControlledBy = charObj[0].get("controlledby");
                                                                _.each(shifter[WS_API.FIELDS.SHAPES], (shape) => {
                                                                    let shapeObj = findObjs({ type: 'character', id: shape[WS_API.FIELDS.ID] });
                                                                    if (shapeObj && shapeObj.length == 1)
                                                                        shapeObj[0].set({controlledby: shifterControlledBy, inplayerjournals: shifterControlledBy});
                                                                });
                                                            }
                                                            else
                                                            {
                                                                UTILS.chatError("Cannot find character [" + newValue + "] in the journal");
                                                            }
                                                        }
                                                        else if(field == WS_API.FIELDS.ISDRUID)
                                                        {
                                                            shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ISDRUID] = !shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ISDRUID];
                                                            isValueSet = true;
                                                        }
                                                        else
                                                        {
                                                            shifter[WS_API.FIELDS.SETTINGS][field] = newValue;
                                                            isValueSet = true;
                                                        }

                                                        if(isValueSet)
                                                            MENU.showEditShifter(shifterKey);
                                                    }
                                                    else
                                                        MENU.showEditShifter(shifterKey);
                                                }
                                                else
                                                {
                                                    UTILS.chatError("cannot find shifter [" + shifterKey + "]");
                                                }
                                            }
                                            break;

                                            case WS_API.FIELDS.TARGET.SHAPE:
                                            {
                                                const shifterKey = args.shift();
                                                let shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
                                                if (shifter)
                                                {
                                                    let shapeKey = args.shift();
                                                    let shape = shifter[WS_API.FIELDS.SHAPES][shapeKey];
                                                    if (shape)
                                                    {
                                                        let field = args.shift();
                                                        if (field)
                                                        {
                                                            let isValueSet = false;
                                                            let newValue = args.shift();
                                                            if(field == WS_API.FIELDS.CHARACTER)
                                                            {
                                                                let shapeObj = findObjs({ type: 'character', name: newValue });
                                                                if(shapeObj && shapeObj.length == 1)
                                                                {
                                                                    // clear old shape data
                                                                    const oldShapeCharacter = findObjs({ type: 'character', id: shape[WS_API.FIELDS.ID] })[0];
                                                                    if (oldShapeCharacter)
                                                                    {
                                                                        oldShapeCharacter.set({controlledby: "", inplayerjournals: ""});
                                                                    }

                                                                    // set new shape id
                                                                    shape[WS_API.FIELDS.ID] = shapeObj[0].get('id');
                                                                    
                                                                    // set new shape data
                                                                    const shifterCharacter = findObjs({ type: 'character', id: shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] })[0];
                                                                    if (shifterCharacter)
                                                                    {
                                                                        const shifterControlledBy = shifterCharacter.get("controlledby");
                                                                        shapeObj[0].set({controlledby: shifterControlledBy, inplayerjournals: shifterControlledBy});
                                                                    }

                                                                    const oldCharacterName = shape[field];
                                                                    shape[field] = newValue;
                                                                    isValueSet = true;
                                                                    
                                                                    if (oldCharacterName == shapeKey)
                                                                    {
                                                                        // also rename id
                                                                        field = WS_API.FIELDS.NAME;
                                                                    }
                                                                }
                                                                else
                                                                {
                                                                    UTILS.chatError("Cannot find character [" + newValue + "] in the journal");
                                                                }
                                                            }                                                            

                                                            if(field == WS_API.FIELDS.NAME)
                                                            {
                                                                let oldShapeKey = shapeKey;
                                                                shapeKey = newValue.trim();
                                                                if (shapeKey && shapeKey.length > 0)
                                                                {
                                                                    if(!shifter[WS_API.FIELDS.SHAPES][shapeKey])
                                                                    {
                                                                        shifter[WS_API.FIELDS.SHAPES][shapeKey] = shape;
                                                                        delete shifter[WS_API.FIELDS.SHAPES][oldShapeKey];
                                                                        sortShapes(shifter);
                                                                        isValueSet = true;
                                                                    }
                                                                    else
                                                                    {
                                                                        UTILS.chatError("Trying to add shape " + shapeKey + " which already exists");
                                                                    }
                                                                }
                                                            }
                                                            else if(!isValueSet)
                                                            {
                                                                shape[field] = newValue;
                                                                isValueSet = true;
                                                            }

                                                            if (isValueSet)
                                                                MENU.showEditShape(shifterKey, shapeKey);
                                                        }
                                                        else
                                                        {
                                                            MENU.showEditShape(shifterKey, shapeKey);
                                                        }
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("cannot find shape [" + shapeKey + "]");
                                                    }
                                                }
                                                else
                                                {
                                                    UTILS.chatError("cannot find shifter [" + shifterKey + "]");
                                                }

                                            }
                                            break;

                                            case WS_API.FIELDS.TARGET.CONFIG:
                                            {
                                                switch (args.shift())
                                                {
                                                    case WS_API.FIELDS.SEP:
                                                    {
                                                        config.SEP = args.shift();
                                                    }
                                                    break;

                                                    case WS_API.FIELDS.TOKEN_DATA.ROOT:
                                                    {
                                                        const field = args.shift();
                                                        config.TOKEN_DATA[field] = args.shift();
                                                    }
                                                    break;
                                                }

                                                MENU.updateConfig();
                                                MENU.showConfigMenu();
                                            }
                                        }
                                    }
                                    break;

                                    case WS_API.CMD.RESET:
                                    {
                                        setDefaults(true);
                                    }
                                    break;


                                    case WS_API.CMD.IMPORT:
                                    {
                                        switch (args.shift())
                                        {
                                            case WS_API.FIELDS.TARGET.SHIFTER:
                                            {
                                                UTILS.chat("Coming soon");
                                            }
                                            break;
                                            case WS_API.FIELDS.TARGET.SHAPE:
                                            {
                                                UTILS.chat("Coming soon");
                                            }
                                            break;

                                            case WS_API.FIELDS.TARGET.SHAPEFOLDER:
                                            {
                                                const shifterKey = args.shift();
                                                let shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
                                                if (shifter)
                                                {
                                                    const folderName = args.shift();
                                                    const searchSubfolders = args.shift() == 'yes';
                                                    const oldPrefix = args.shift();
                                                    const newPrefix = args.shift();
                                                    const noPrefixToId = args.shift() == 'no';

                                                    let folderShapes = UTILS.findCharactersInFolder(folderName, searchSubfolders);
                                                    if(folderShapes)
                                                    {
                                                        if (WS_API.DEBUG)
                                                        {
                                                            _.each(folderShapes, function(shape) { UTILS.chat(JSON.stringify(shape)); });
                                                        }

                                                        _.each(folderShapes, function(shape) {
                                                            let shapeObj = findObjs({ type: 'character', id: shape.id })[0];                                                            
                                                            if (shapeObj)
                                                            {
                                                                let shapeId = null;

                                                                // rename
                                                                let oldName = shapeObj.get("name");
                                                                if(oldPrefix || newPrefix)
                                                                {
                                                                    let name = oldName;
                                                                    if(oldPrefix && name.startsWith(oldPrefix)) {
                                                                        name = name.slice(oldPrefix.length);
                                                                    }

                                                                    if (noPrefixToId)
                                                                    {
                                                                        shapeId = name;
                                                                    }

                                                                    if (newPrefix)
                                                                    {
                                                                        name = newPrefix + name;
                                                                    }

                                                                    shapeObj.set("name", name);
                                                                }

                                                                // add shape to shifter
                                                                if(!addShapeToShifter(shifter, shapeObj, shapeId, false))
                                                                    shapeObj.set("name", oldName);
                                                            }
                                                        });

                                                        sortShapes(shifter);

                                                        UTILS.chat("Importing Shapes from folder [" + folderName + "] completed");
                                                        MENU.showEditShifter(shifterKey);
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Cannot find any shapes in the input folder  [" + folderName + "]");
                                                    }
                                                }
                                                else
                                                {
                                                    UTILS.chatError("Trying to add shape to ShapeShifter " + shifterKey + " which doesn't exist");
                                                    MENU.showShifters();
                                                }                                                
                                            }
                                            break;
                                        }
                                    }
                                    break;

                                    case WS_API.CMD.EXPORT:
                                    {
                                        switch (args.shift())
                                        {
                                            case WS_API.FIELDS.TARGET.SHIFTER:
                                            {
                                                UTILS.chat("Coming soon");
                                            }
                                            break;

                                            case WS_API.FIELDS.TARGET.SHAPE:
                                            {
                                                UTILS.chat("Coming soon");
                                            }
                                            break;
                                        }
                                    }
                                    break;

                                    default: MENU.showConfigMenu();
                                }
                            }
                            break;

                            case WS_API.CMD.HELP:
                            {
                                UTILS.chat(WS_API.CMD.USAGE);
                            }
                            break;
                        }
                    }
                }
            }
        }
    };

    const setDefaults = (reset) => {
        let newVersionDetected = false;

        if (!state[WS_API.STATENAME][WS_API.DATA_CONFIG] || reset) 
        {
            state[WS_API.STATENAME][WS_API.DATA_CONFIG] = WS_API.DEFAULTS.CONFIG;
            state[WS_API.STATENAME][WS_API.DATA_CONFIG].VERSION = WS_API.VERSION;
        }        
        else 
        {
            // TO DO: implement versioning

            state[WS_API.STATENAME][WS_API.DATA_CONFIG].VERSION = WS_API.VERSION;
            MENU.updateConfig();
        }

        if (!state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] || typeof state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] !== 'object' || reset)
        {
            state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] = {};
        }

        if (!state[WS_API.STATENAME].hasOwnProperty('firsttime') || reset || newVersionDetected)
        {
            MENU.showConfigMenu(true);
            state[WS_API.STATENAME].firsttime = false;
        }
    };

    const start = () => {
        // check install
        if(!_.has(state, WS_API.STATENAME)) 
        {
            state[WS_API.STATENAME] = state[WS_API.STATENAME] || {};
        }
        setDefaults();

        // register event handlers
        on('chat:message', handleInput);

        log(WS_API.NAME + ' Ready!');
        UTILS.chat("API Ready, command: " + WS_API.CMD.ROOT);
    };
    
    return {
        start
    };
})();


on('ready', () => { 
    'use strict';

    WildShape.start();
});