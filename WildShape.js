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
    VERSION : "1.0.5",
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

        CONFIG : {
            SEP: "###",              // separator used in commands

            PC_DATA : {
                HP: "hp",
                AC: "ac",
                SPEED: "speed",
            },

            NPC_DATA : {
                HP_CACHE: "npcCachedHp",
                //SENSES_CACHE: "npcCachedSenses",
                HP: "hp",
                AC: "npc_ac",
                SPEED: "npc_speed",
            },

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
        MAKEROLLPUBLIC: "makerollpublic",
        ISNPC: "isnpc",
        CURRENT_SHAPE: "currshape",

        SEP: "sep",

        TOKEN_DATA : {
            ROOT: "tokendata",
            HP: "HP",
            AC: "AC",
            SPEED: "SPEED",
        },

        NPC_DATA : {
            ROOT: "npcdata",
            HP: "HP",
            AC: "AC",
            SPEED: "SPEED",
        },

        PC_DATA : {
            ROOT: "pcdata",
            HP: "HP",
            AC: "AC",
            SPEED: "SPEED",
        }
    },

    CHANGELOG : {
        "1.0.5" : "changed default separator to minimize collisions",
        "1.0.4" : "added override roll settings (default true on PCs) to automatically set target shapes to never whisper, toggle advantage",
        "1.0.2" : "restructured pc/npc data",
    }
};

class WildShapeMenu extends WildMenu
{
    constructor() {
        super();
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

        this.UTILS = new WildUtils(WS_API.NAME);
        this.SHAPE_SIZES = WS_API.SHAPE_SIZES.join("|");
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
            listSettings.push(this.makeListLabelValue("Override Roll Settings", shifterSettings[WS_API.FIELDS.MAKEROLLPUBLIC], 'false') + this.makeListButton("Toggle", cmdShifterEdit + shifterId + this.SEP + WS_API.FIELDS.MAKEROLLPUBLIC));
            listSettings.push(this.makeListLabel("Automatically set to never whisper, toggle advantage", "font-size: 80%"));
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

    showConfigMenu(newVersion) {
        const config = state[WS_API.STATENAME][WS_API.DATA_CONFIG];

        const apiCmdBase = this.CMD.ROOT;
        const cmdConfigEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.CONFIG + this.SEP;

        const showShiftersButton = this.makeButton("Edit ShapeShifters", apiCmdBase + WS_API.CMD.SHOW_SHIFTERS, ' width: 100%');
        
        let otherSettingsList = [
            this.makeListLabelValue("Commands Separator", this.SEP) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.SEP + this.SEP + "?{New Separator}"),
            this.makeListLabel("Please make sure your names/strings don't include the separator used by the API", "font-size: 80%"),
        ];

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

        let pcDataList = [
            this.makeListLabel("<p style='font-size: 120%'><b>PC Data:</b></p>"),
            this.makeListLabel("Attributes on sheets used to link to the data", "font-size: 80%; padding-left: 10px; padding-bottom: 10px"),

            this.makeList(
                [ 
                    this.makeListLabelValue("HP", config.PC_DATA.HP) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.PC_DATA.ROOT + this.SEP + WS_API.FIELDS.PC_DATA.HP + this.SEP + "?{Attribute|" + config.PC_DATA.HP + "}"),
                    this.makeListLabelValue("AC", config.PC_DATA.AC) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.PC_DATA.ROOT + this.SEP + WS_API.FIELDS.PC_DATA.AC + this.SEP + "?{Attribute|" + config.PC_DATA.AC + "}"),
                    this.makeListLabelValue("SPEED", config.PC_DATA.SPEED) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.PC_DATA.ROOT + this.SEP + WS_API.FIELDS.PC_DATA.SPEED + this.SEP + "?{Attribute|" + config.PC_DATA.SPEED + "}"),
                ], " padding-left: 10px"),
        ];

        let npcDataList = [
            this.makeListLabel("<p style='font-size: 120%'><b>NPC Data:</b></p>"),
            this.makeListLabel("Attributes on sheets used to link to the data", "font-size: 80%; padding-left: 10px; padding-bottom: 10px"),

            this.makeList(
                [ 
                    this.makeListLabelValue("HP", config.NPC_DATA.HP) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.NPC_DATA.ROOT + this.SEP + WS_API.FIELDS.NPC_DATA.HP + this.SEP + "?{Attribute|" + config.NPC_DATA.HP + "}"),
                    this.makeListLabelValue("AC", config.NPC_DATA.AC) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.NPC_DATA.ROOT + this.SEP + WS_API.FIELDS.NPC_DATA.AC + this.SEP + "?{Attribute|" + config.NPC_DATA.AC + "}"),
                    this.makeListLabelValue("SPEED", config.NPC_DATA.SPEED) + this.makeListButton("Edit", cmdConfigEdit + WS_API.FIELDS.NPC_DATA.ROOT + this.SEP + WS_API.FIELDS.NPC_DATA.SPEED + this.SEP + "?{Attribute|" + config.NPC_DATA.SPEED + "}"),
                ], " padding-left: 10px"),
        ];
          
        //const importButton = this.makeButton('Import Config', this.CMD.CONFIG + this.SEP + WS_API.CMD.IMPORT + this.SEP + '?{Config}', ' width: 100%');
        const resetButton = this.makeButton('Reset', this.CMD.CONFIG_RESET + this.SEP + "?{Are you sure?|no|yes}", ' width: 100%');

        let title_text = WS_API.NAME + " v" + WS_API.VERSION + ((newVersion) ? ': New Version Setup' : ': Config');
        let contents = showShiftersButton
                        + '<hr>' + this.makeList(otherSettingsList)
                        + '<hr>' + this.makeList(tokenDataList)
                        + '<hr>' + this.makeList(pcDataList)
                        + '<hr>' + this.makeList(npcDataList)
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

    const findShifterData = (selectedToken) => {
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

    async function getDefaultTokenImage(character) {
        let img = null;

        // get token image
        character.get('defaulttoken', function(defaulttoken) {
            const dt = JSON.parse(defaulttoken);
            if (dt)
            {
                img = UTILS.getCleanImgsrc(dt.imgsrc);
            }
            else
                img = "";
        });

        while (img == null)
        {
            await UTILS.sleep(50);
        }

        return img;
    }

    async function getCharacterData(shiftData, isNpc, isDefault) {
        const config = state[WS_API.STATENAME][WS_API.DATA_CONFIG];
        const shifterSettings = shiftData.shifter[WS_API.FIELDS.SETTINGS];

        let data = {};
        
        let targetImg = "";
        let targetSize = 1;

        let hpName;
        let acName;
        let speedName;
/*
        let senses = {
            light_radius: 5,
            light_dimradius: -5,
            light_otherplayers: false,
            light_angle: 360,
            light_losangle: 360,
            light_multiplier: 1, 
            light_hassight: true,            
        };

        const lightAttrs = [
            "light_radius",
            "light_dimradius",
            "light_otherplayers",
            "light_angle",
            "light_losangle",
            "light_multiplier", 
            "light_hassight"];

        // check if we are transforming to the default shape
        if (isDefault)
        {
            if (shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] != WS_API.DEFAULTS.BASE_SHAPE)
            {
                // restore from cached data
                _.each(lightAttrs, function saveAttr(attr) {
                    senses[attr] = shifterSettings[config.NPC_DATA.SENSES_CACHE][attr];
                });
            }
            else
                return null;
        }
        else
        {
            if (shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] == WS_API.DEFAULTS.BASE_SHAPE)
            {
                // cache current token values
                _.each(lightAttrs, function saveAttr(attr) {
                    shifterSettings[config.NPC_DATA.SENSES_CACHE][attr] = shiftData.token.get(attr);
                });
            }

            if (isNpc)
            {
                // get npc senses 
                let targetSenses = getAttrByName(shiftData.targetCharacterId, "npc_senses");
                if (targetSenses)
                {
                    // set radius to darkvision
                    let visionSense = targetSenses.match(/darkvision\s([0-9]+)/);
                    let hasDarkvision = visionSense && visionSense.length >= 2; 
                    if (hasDarkvision)
                        senses.light_radius = visionSense[1];

                    visionSense = targetSenses.match(/blindsight\s([0-9]+)/);
                    if (visionSense && visionSense.length >= 2)
                    {
                        // set end of bright radius to blindsight
                        senses.dimradius = visionSense[1];
                        if (!hasDarkvision)
                            senses.light_radius = senses.light_dimradius;
                    }
                }
            }
            else
            {
                // cannot get vision senses from PC, keep defaults
            }
        }
*/

        if(isNpc)
        {
            hpName      = config.NPC_DATA.HP;
            acName      = config.NPC_DATA.AC;
            speedName   = config.NPC_DATA.SPEED;

            // get token image
            targetImg = UTILS.getCleanImgsrc(shiftData.targetCharacter.get('avatar'));
            if (targetImg == "")
            {
                UTILS.chatErrorToPlayer(shiftData.who, "the NPC avatar needs to be re-uploaded into the library and set on the target character; cannot use marketplace link");
                return null;
            }
            
            // get token size
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
            hpName      = config.PC_DATA.HP;
            acName      = config.PC_DATA.AC;
            speedName   = config.PC_DATA.SPEED;

            // the get on _defaulttoken is async, need to wait on it
            await getDefaultTokenImage(shiftData.targetCharacter).then((img) => {
                targetImg = img;

                if (targetImg == "")
                {
                    targetImg = UTILS.getCleanImgsrc(shiftData.targetCharacter.get('avatar'));

                    if (targetImg == "")
                    {
                        UTILS.chatErrorToPlayer(shiftData.who, "cannot find token or avatar image for PC " + shiftData.targetCharacterId);
                        return null;
                    }
                }
            });

            // get token size
            targetSize = getCreatureSize(shifterSettings[WS_API.FIELDS.SIZE]);
            
            // auto defaults to normal on PCs
            if (targetSize == 0)
                targetSize = 1;
        }

        let hpObj = findObjs({type: "attribute", characterid: shiftData.targetCharacterId, name: hpName})[0];
        let acObj = findObjs({type: "attribute", characterid: shiftData.targetCharacterId, name: acName})[0];
        let speedObj = findObjs({type: "attribute", characterid: shiftData.targetCharacterId, name: speedName})[0];
        
        if(hpObj)
        {
            data.hp             = {};
            data.hp.current     = hpObj.get('current');
            data.hp.max         = hpObj.get('max');
            data.hp.id          = hpObj.id;
        }
        else
        {
            UTILS.chatErrorToPlayer(shiftData.who, "cannot find attribute [" + hpName + "] on character: " + shiftData.targetCharacterId);
            return null;
        }

        if (acObj)
        {
            data.ac             = {};
            data.ac.current     = acObj.get('current');
            data.ac.max         = acObj.get('max');
            data.ac.id          = acObj.id;
        }
        else
        {
            UTILS.chatErrorToPlayer(shiftData.who, "cannot find attribute [" + acName + "] on character: " + shiftData.targetCharacterId);
            return null;
        }

        if (speedObj)
        {
            data.speed          = {};
            data.speed.current  = speedObj.get('current');
            data.speed.max      = speedObj.get('max');
            data.speed.id       = speedObj.id;
        }
        else
        {
            UTILS.chatErrorToPlayer(shiftData.who, "cannot find attribute [" + speedName + "] on character: " + shiftData.targetCharacterId);
            return null;
        }

        if (targetImg == "")
        {
            UTILS.chatError("cannot find target image");
            return null;
        }

        data.imgsrc = targetImg;
	    data.characterId = shiftData.targetCharacterId;
        data.controlledby = shiftData.shifterControlledby;
        data.tokenSize = targetSize;
        //data.senses = senses;

        // special handling of NPC ShapeShifter to restore hp when going back to original form, as they don't store the current in hp
        if(shifterSettings[WS_API.FIELDS.ISNPC])
        {
            if (isDefault)
            {
                if (shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] != WS_API.DEFAULTS.BASE_SHAPE)
                {
                    data.hp.current = shifterSettings[config.NPC_DATA.HP_CACHE];
                }
                else
                    return null;
            }
            else if (shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] == WS_API.DEFAULTS.BASE_SHAPE)
            {
                // cache current npc hp value
                shifterSettings[config.NPC_DATA.HP_CACHE] = shiftData.token.get(config.TOKEN_DATA.HP + "_value");
            }
        }

        return data;
    }

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

    async function doShapeShift(shiftData) {
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
            shiftData.targetCharacterId = shiftData.shifterCharacterId;
            shiftData.targetCharacter = shiftData.shifterCharacter;
            isTargetNpc = shifterSettings[WS_API.FIELDS.ISNPC];
            isTargetDefault = true;
        }

        let targetData = null;
        await getCharacterData(shiftData, isTargetNpc, isTargetDefault).then((ret) => { targetData = ret; });
        if (!targetData)
            return false;

        if (WS_API.DEBUG)
        {
            UTILS.chat("====== TARGET STATS ======");
            UTILS.chat("token_size = " + targetData.tokenSize);
            UTILS.chat("controlledby = " + targetData.controlledby);
            UTILS.chat("avatar = " + targetData.imgsrc);
            UTILS.chat("hp = " + (targetData.hp ? targetData.hp.current : "invalid"));
            UTILS.chat("ac = " + (targetData.ac ? targetData.ac.current : "invalid"));
            UTILS.chat("npc speed = " + (targetData.speed ? targetData.speed.current : "invalid"));
        }

        const config = state[WS_API.STATENAME][WS_API.DATA_CONFIG];

        if (isTargetNpc)
        {
            // copy over druid attributes
            if (shifterSettings[WS_API.FIELDS.ISDRUID])
            {
                copyDruidData(shifterSettings[WS_API.FIELDS.ID], shiftData.targetCharacterId);
            }

            if (targetData.ac && config.TOKEN_DATA.AC != config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set(config.TOKEN_DATA.AC + "_link", 'None');
                shiftData.token.set(config.TOKEN_DATA.AC + "_value", targetData.ac.current);
            }

            if (targetData.speed && config.TOKEN_DATA.SPEED != config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set(config.TOKEN_DATA.SPEED + "_link", 'None');
                shiftData.token.set(config.TOKEN_DATA.SPEED + "_value", targetData.speed.current.split(' ')[0]);
            }

            // set HP last in case we need to override another value because of wrong data
            if (targetData.hp)
            {
                shiftData.token.set(config.TOKEN_DATA.HP + "_link", 'None');
                shiftData.token.set(config.TOKEN_DATA.HP + "_value", isTargetDefault ? targetData.hp.current : targetData.hp.max);
                shiftData.token.set(config.TOKEN_DATA.HP + "_max", targetData.hp.max);
            }
        }
        else
        {
            if (targetData.ac && config.TOKEN_DATA.AC != config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set(config.TOKEN_DATA.AC + "_link", isTargetDefault ? targetData.ac.id : 'None');
                shiftData.token.set(config.TOKEN_DATA.AC + "_value", targetData.ac.current);
            }

            if (targetData.speed && config.TOKEN_DATA.SPEED != config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set(config.TOKEN_DATA.SPEED + "_link", targetData.speed.id);
                shiftData.token.set(config.TOKEN_DATA.SPEED + "_value", targetData.speed.current);
            }

            // set HP last in case we need to override another value because of wrong data
            if (targetData.hp)
            {
                shiftData.token.set(config.TOKEN_DATA.HP + "_link", isTargetDefault ? targetData.hp.id : 'None');
                shiftData.token.set(config.TOKEN_DATA.HP + "_value", isTargetDefault ? targetData.hp.current : targetData.hp.max);
                shiftData.token.set(config.TOKEN_DATA.HP + "_max", targetData.hp.max);
            }
        }

        // override default rolltype, whisper and autoroll damage settings to: toggle, visible to everyone and don't auto roll damage
        // sometimes as a default values these attributes don't exist at all so we need to create them 
        if (shifterSettings[WS_API.FIELDS.MAKEROLLPUBLIC])
        {
            UTILS.setAttribute(shiftData.targetCharacterId, "rtype", "@{advantagetoggle}", true);
            UTILS.setAttribute(shiftData.targetCharacterId, "advantagetoggle", "{{query=1}} {{normal=1}} {{r2=[[0d20", true);
            UTILS.setAttribute(shiftData.targetCharacterId, "wtype", "", true);
            UTILS.setAttribute(shiftData.targetCharacterId, "dtype", "pick", true);
        }

        // we need to turn bar visibility on if the target is controlled by a player
        if (targetData.controlledby.length > 0)
        {
            if (config.TOKEN_DATA.AC !== config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set("showplayers_" + config.TOKEN_DATA.AC, false);
                shiftData.token.set("playersedit_" + config.TOKEN_DATA.AC, true);
            }

            if (config.TOKEN_DATA.SPEED !== config.TOKEN_DATA.EMPTYBAR)
            {
                shiftData.token.set("showplayers_" + config.TOKEN_DATA.SPEED, false);
                shiftData.token.set("playersedit_" + config.TOKEN_DATA.SPEED, true);
            }

            shiftData.token.set("showplayers_" + config.TOKEN_DATA.HP, false);
            shiftData.token.set("playersedit_" + config.TOKEN_DATA.HP, true);
        }

        // check if the token is on a scaled page
        let tokenPageScale = 1.0;
        var tokenPageData = getObj("page", shiftData.token.get("pageid"));
        if (tokenPageData)
        {
            tokenPageScale = tokenPageData.get("snapping_increment");
        }

        let tokenBaseSize = 70 * tokenPageScale;

        // set other token data
        shiftData.token.set({
            imgsrc: targetData.imgsrc,
            represents: targetData.characterId,
            height: tokenBaseSize * targetData.tokenSize,
            width: tokenBaseSize * targetData.tokenSize,
        });

/*
        const lightAttrs = [
            "light_radius",
            "light_dimradius",
            "light_otherplayers",
            "light_angle",
            "light_losangle",
            "light_multiplier", 
            "light_hassight"];

        _.each(lightAttrs, function setLightAttr(attr) {
            shiftData.token.set(attr, targetData.senses[attr]);
        });
        */

        if (!isTargetDefault)
        {
            shiftData.targetCharacter.set({controlledby: targetData.controlledby, inplayerjournals: targetData.controlledby});
        }

        shifterSettings[WS_API.FIELDS.CURRENT_SHAPE] = shiftData.targetShapeName;
        
        return true;
    }

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

    const handleInputShift = (msg, args, config) => 
    {
        if(!msg.selected)
        {
            UTILS.chatErrorToPlayer(msg.who, "Please select a token before shapeshifting");
            return;
        }

        const shifterName = args.shift();
        const shapeName = args.shift();

        const obj = findShifterData(msg.selected[0]);
        if(obj)
        {
            // check that the player sending the command can actually control the token
            if (playerIsGM(msg.playerid) || obj.shifterControlledby.search(msg.playerid) >= 0 || obj.shifterControlledby.search("all") >= 0)
            {
                obj.who = msg.who;
                obj.targetShapeName = shapeName.toLowerCase();

                if (obj.targetShapeName !== obj.shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.CURRENT_SHAPE])
                {
                    if (obj.targetShapeName != WS_API.DEFAULTS.BASE_SHAPE)
                    {
                        obj.targetShape = obj.shifter[WS_API.FIELDS.SHAPES][shapeName];
                        if (!obj.targetShape)
                        {
                            UTILS.chatErrorToPlayer(msg.who, "Cannot find shape [" + shapeName + "] for ShapeShifter: " + obj.shifterId);
                            return;
                        }
                    }

                    doShapeShift(obj).then((ret) => {
                        if (ret)
                        {
                            if (obj.targetShape)
                                UTILS.chatAs(obj.shifterCharacter.get("id"), "Transforming into " + shapeName, null, null);
                            else
                                UTILS.chatAs(obj.shifterCharacter.get("id"), "Transforming back into " + obj.shifterId, null, null);
                        }
                    });
                }
                else
                {
                    UTILS.chatErrorToPlayer(msg.who, "You are already transformed into " + shapeName);
                }
            }
            else
            {
                UTILS.chatErrorToPlayer(msg.who, "Trying to shapeshift on a token you don't have control over");
            }
        }
        else
        {
            UTILS.chatErrorToPlayer(msg.who, "Cannot find a ShapeShifter for the selected token");
        }

    };

    const handleInputAddShifter = (msg, args, config) => 
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
                    shifterSettings[WS_API.FIELDS.MAKEROLLPUBLIC] = !isNpc;
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
            UTILS.chatError("Trying to add ShapeShifter from a token without a name");
        }
    };

    const handleInputAddShape = (msg, args, config) => 
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
    };

    const handleInputRemoveShifter = (msg, args, config) => 
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
    };

    const handleInputRemoveShape = (msg, args, config) => 
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
    };

    const handleInputEditShifter = (msg, args, config) => 
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
                else if(field == WS_API.FIELDS.MAKEROLLPUBLIC)
                {
                    shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.MAKEROLLPUBLIC] = !shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.MAKEROLLPUBLIC];
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
    };

    const handleInputEditShape = (msg, args, config) => 
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

    };

    const handleInputEditConfig = (msg, args, config) => 
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

            case WS_API.FIELDS.PC_DATA.ROOT:
            {
                const field = args.shift();
                config.PC_DATA[field] = args.shift();
            }
            break;

            case WS_API.FIELDS.NPC_DATA.ROOT:
            {
                const field = args.shift();
                config.NPC_DATA[field] = args.shift();
            }
            break;

        }

        MENU.updateConfig();
        MENU.showConfigMenu();
    };

    const handleInputImportShapeFolder = (msg, args, config) => 
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
    };

    const handleInput = (msg) => {
        if (msg.type === "api" && msg.content.indexOf(WS_API.CMD.ROOT) == 0)
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

                const obj = findShifterData(msg.selected[0]);
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
                    handleInputShift(msg, args, config);
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
                                        case WS_API.FIELDS.TARGET.SHIFTER:  handleInputAddShifter(msg, args, config); break;
                                        case WS_API.FIELDS.TARGET.SHAPE:    handleInputAddShape(msg, args, config); break;
                                    }
                                }
                                break;

                                case WS_API.CMD.REMOVE:
                                {
                                    if (args.shift() == 'no')
                                        return;

                                    switch (args.shift())
                                    {
                                        case WS_API.FIELDS.TARGET.SHIFTER:  handleInputRemoveShifter(msg, args, config); break;
                                        case WS_API.FIELDS.TARGET.SHAPE:    handleInputRemoveShape(msg, args, config); break;
                                    }
                                }
                                break;

                                case WS_API.CMD.EDIT:
                                {
                                    switch (args.shift())
                                    {
                                        case WS_API.FIELDS.TARGET.SHIFTER:  handleInputEditShifter(msg, args, config); break;
                                        case WS_API.FIELDS.TARGET.SHAPE:    handleInputEditShape(msg, args, config); break;
                                        case WS_API.FIELDS.TARGET.CONFIG:   handleInputEditConfig(msg, args, config); break;
                                    }
                                }
                                break;

                                case WS_API.CMD.RESET:
                                {
                                    if (args.shift() == 'no')
                                        return;

                                    setDefaults(true);
                                }
                                break;


                                case WS_API.CMD.IMPORT:
                                {
                                    switch (args.shift())
                                    {
                                        case WS_API.FIELDS.TARGET.SHAPEFOLDER: handleInputImportShapeFolder(msg, args, config); break;
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
    };

    const showUpgradeChangelog = (version) =>
    {
        UTILS.chat("Upgrading to " + version + ": " + WS_API.CHANGELOG[version]);
    };

    const upgradeVersion = () => {
        const currentVersion = state[WS_API.STATENAME][WS_API.DATA_CONFIG].VERSION;
        const newConfig = WS_API.DEFAULTS.CONFIG;

        let config = state[WS_API.STATENAME][WS_API.DATA_CONFIG];
        let shifters = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS];

        if (UTILS.compareVersion(currentVersion, "1.0.2") < 0)
        {
            showUpgradeChangelog("1.0.2");
            config.NPC_DATA = {};
            config.NPC_DATA.HP_CACHE = newConfig.NPC_DATA.HP_CACHE;
            config.NPC_DATA.HP       = newConfig.NPC_DATA.HP;
            config.NPC_DATA.AC       = newConfig.NPC_DATA.AC;
            config.NPC_DATA.SPEED    = newConfig.NPC_DATA.SPEED;

            config.PC_DATA = {};
            config.PC_DATA.HP        = newConfig.PC_DATA.HP;
            config.PC_DATA.AC        = newConfig.PC_DATA.AC;
            config.PC_DATA.SPEED     = newConfig.PC_DATA.SPEED;
        }

        if (UTILS.compareVersion(currentVersion, "1.0.4") < 0)
        {
            showUpgradeChangelog("1.0.4");

            // add MAKEROLLPUBLIC field to shifters, default to true for non-npcs
            _.each(shifters, (value, shifterId) => {
                let shifterSettings = shifters[shifterId][WS_API.FIELDS.SETTINGS];
                shifterSettings[WS_API.FIELDS.MAKEROLLPUBLIC] = !shifterSettings[WS_API.FIELDS.ISNPC];
            });
        }

        if (UTILS.compareVersion(currentVersion, "1.0.5") < 0)
        {
            showUpgradeChangelog("1.0.5");

            // updated separator to minimize collisions with names/strings
            if(config.SEP == "--")
                config.SEP = newConfig.SEP;
        }

        config.VERSION = WS_API.VERSION;
    };

    const setDefaults = (reset) => {
        let newVersionDetected = false;

        if(!state[WS_API.STATENAME] || typeof state[WS_API.STATENAME] !== 'object' || reset)
        {
            state[WS_API.STATENAME] = {};
            reset = true;
        }

        if (!state[WS_API.STATENAME][WS_API.DATA_CONFIG] || typeof state[WS_API.STATENAME][WS_API.DATA_CONFIG] !== 'object' || reset) 
        {
            state[WS_API.STATENAME][WS_API.DATA_CONFIG] = WS_API.DEFAULTS.CONFIG;
            state[WS_API.STATENAME][WS_API.DATA_CONFIG].VERSION = WS_API.VERSION;
            newVersionDetected = true;
        }        
        else 
        {
            newVersionDetected = UTILS.compareVersion(state[WS_API.STATENAME][WS_API.DATA_CONFIG].VERSION, WS_API.VERSION) < 0 ? true : false;

            if (newVersionDetected)
            {

                UTILS.chat("new version detected, upgrading from " + state[WS_API.STATENAME][WS_API.DATA_CONFIG].VERSION + " to " + WS_API.VERSION);
                upgradeVersion();
            }
        }

        if (!state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] || typeof state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] !== 'object' || reset)
        {
            state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] = {};
        }

        MENU.updateConfig();

        if (reset || newVersionDetected)
        {
            MENU.showConfigMenu(true);
        }
    };

    const start = () => {
        // check install
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