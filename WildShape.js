/*

importing a monster from the MonsterManual:
- make a copy and optionally add a prefix for your shapeshifter to its name
- open the monster and download its avatar 
- re-add the image to the library
- set the image from the library as the monster avatar

*/

/*jshint -W069 */
/*jshint -W014 */

/*
const ShapeShiftersExample =
{
    Helia: { // this needs to match the "visible name" of you character token
        settings : {
            character: "Copy of Helia", // character name in the journal
            shapesPrefix: "Helia-",      //  prefix used on all journal entries for this character shapes
            size: "gargantuan",             // optional, string in ["normal", "large", "huge", "gargantuan"], null defaults to normal
            isdruid: true,
        },

        shapes: {
            GiantToad: {                // this matches the input to the !ws command
                character: "Giant Toad",  // optional, name of the character/npc in the journal (ignoring the prefix), default matches the key "GiantToad"
                size: "auto",
            },

            "Adult_Black_Dragon": {
                character: "dragon",
                size: "auto",              // optional, ["auto", "normal", "large", "huge", "gargantuan"], null defaults to NPC token_size attribute
            },
        }
    },

    Lavinia: {
        settings : {
            character: "Copy of Lavinia",
            shapesPrefix: "Lavinia-",
            size: "normal",             // optional, string in ["normal", "large", "huge", "gargantuan"], null defaults to normal
            isdruid: true,
        },

        shapes: {
            GiantToad: {                // this matches the input to the !ws command
                character: "Giant Toad",  // optional, name of the character/npc in the journal (ignoring the prefix), default matches the key "GiantToad"
                size: "huge",
            },

            "Adult_Black_Dragon": {
                character: "dragon",
                size: "gargantuan",              // optional, ["auto", "normal", "large", "huge", "gargantuan"], null defaults to NPC token_size attribute
            },
        }
    }
};
*/

const API = {
    NAME : "WildShape",
    VERSION : "0.1",
    STATENAME : "WILDSHAPE",
    DEBUG : false,

    // storage in the state
    DATA_CONFIG : "config",
    DATA_SHIFTERS : "shifters",

    // general info
    DEFAULT_SHAPE : "default",
    DEFAULT_SHIFTER_SIZE : "normal",
    DEFAULT_SHAPE_SIZE : "auto",
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
        SEP : '#', // separator used in commands
        USAGE : "Please select a token then run: !ws",

        HELP : "help",

        CONFIG : "config",
        ADD : "add",
        REMOVE : "remove",
        EDIT : "edit",
        RESET : "reset",

        SHIFT : "shift",

        SHOW_SHIFTERS : "showshifters",        
    },

    // fields that can be changed by commands
    FIELDS : {
        // target of the command
        TARGET : {
            SHIFTER : "shifter",
            SHAPE : "shape",
        },

        SETTINGS: "settings",
        SHAPES: "shapes",

        ID: "ID",
        NAME: "name",
        CHARACTER: "character",
        SHAPE_PREFIX: "shapesPrefix",
        SIZE: "size",
        ISDRUID: "isdruid",
    }
};

class Utils {
    constructor() {

    }

    chat(msg) {
        sendChat(API.NAME, "/w gm" + msg);
    }

    chatToPlayer(playerid, msg) {
        sendChat(API.NAME, "/w " + playerid + " " + msg);
    }

    chatError(msg) {
        sendChat(API.NAME, "/w gm ERROR: " + msg);
    }

    chatErrorToPlayer(playerid, msg) {
        sendChat(API.NAME, "/w " + playerid + " ERROR: " + msg);
    }

    getCleanImgsrc(imgsrc) {
        let parts = imgsrc.match(/(.*\/images\/.*)(thumb|med|original|max)([^\?]*)(\?[^?]+)?$/);
        if(parts) {
            return parts[1]+'thumb'+parts[3]+(parts[4]?parts[4]:`?${Math.round(Math.random()*9999999)}`);
        }
        return;
    }

    copyAttribute(fromId, toId, fromAttrName, toPrefix, toSuffix, onlyIfGreater = true, createAttr = false) {
        if(!toPrefix)
            toPrefix = "";
        if(!toSuffix)
            toSuffix = "";

        const toAttrName = toPrefix + fromAttrName + toSuffix;

        //UTILS.chat("setting attribute: " + toAttrName + ", from: " + fromAttrName);
        var fromAttr = getAttrByName(fromId, fromAttrName);
        var toAttr = findObjs({_type: "attribute", name: toAttrName, _characterid: toId})[0];
        if (!toAttr) {
            if(createAttr)
            {
                createObj('attribute', {
                    characterid: toId,
                    name: toName,
                    current: fromAttr,
                    max: fromAttr
                });
            }
            else
            {
                UTILS.chatError("Cannot find attribute " + toAttrName + " on character " + toId);
            }
        }
        else if(!onlyIfGreater || toAttr.get("current") < fromAttr)
            toAttr.set("current", fromAttr);
    }

    duplicateCharacter(o) {
        const simpleObj = (o)=>JSON.parse(JSON.stringify(o));

        let c = simpleObj(o.character);
        let oldCid = o.character.id;
        delete c.id;
        c.name=`(COPY) ${c.name}`;
        c.avatar=getCleanImgsrc(c.avatar)||'';

        let newC = createObj('character',c);
        o.token.set('represents',newC.id);
        setDefaultTokenForCharacter(newC,o.token);
        o.token.set('represents',oldCid);

        _.each(findObjs({type:'attribute',characterid:oldCid}),(a)=>{
            let sa = simpleObj(a);
            delete sa.id;
            delete sa._type;
            delete sa._characterid;
            sa.characterid = newC.id;
            createObj('attribute',sa);
        });
        _.each(findObjs({type:'ability',characterid:oldCid}),(a)=>{
            let sa = simpleObj(a);
            delete sa.id;
            delete sa._type;
            delete sa._characterid;
            sa.characterid = newC.id;
            createObj('ability',sa);
        });
    }

    /*
    _.chain(msg.selected)
    .map((o)=>getObj('graphic',o._id))
    .reject(_.isUndefined)
    .map(o=>({token: o, character: getObj('character',o.get('represents'))}))
    .reject(o=>_.isUndefined(o.character))
    .tap(o=>{
        if(!o.length){
            sendChat('',`/w gm <div style="color: #993333;font-weight:bold;">Please select one or more tokens which represent characters.</div>`);
        } else {
            sendChat('',`/w gm <div style="color: #993333;font-weight:bold;">Duplicating: ${o.map((obj)=>obj.character.get('name')).join(', ')}</div>`);
        }
    })
    .each(duplicateCharacter);
    */
    getCharactersWithAttrByName(attributeName) {
        /* start the chain with all the attribute objects named 'player-name' */
        return _
        .chain(filterObjs((o)=>{
            return (o.get('type')==='attribute' &&
                o.get('name')===attributeName);
        }))

        /* IN: Array of Attribute Objects */
        /* extract the characterid from each */
        .reduce((m,o)=>{
            let obj={};
            obj.cid=o.get('characterid');
            obj[attributeName]=o;
            m.push(obj);
            return m;
        },
        []
        )

        /* IN: Array of Objects with 
        * Character ID in property cid 
        * attribute in [attributeName]
        */
        /* add characters to the objects */
        .map((o)=>{
            o.char=getObj('character',o.cid);
            return o;
        })

        /* IN: Array of Objects with 
        * Character ID in property cid 
        * attribute in [attributeName]
        * character in property char
        */
        /* remove any entries that didn't have Characters */
        .reject( (o)=> {return _.isUndefined(o.char);} )

        /* IN: Array of Character Objects */
        /* Unwrap Chain and return the array */
        .value();
    }

    /*var charsWithPN = getCharactersWithAttrByName('player-name');
    _.each(charsWithPN,(o)=>{
        log(`Character ${o.char.get('name')} has player-name of ${o['player-name'].get('current')}/${o['player-name'].get('max')}`);
    });*/

    getFolderObjects(objs) {
        return _.map(objs, function(o) {
            if (_.isString(o)) {
                return getObj('handout', o) || getObj('character', o);
            }
            if (_.isArray(o.i)) {
                o.i = getFolderObjects(o.i);
                return o;
            }
        });
    }

    getObjectFromFolder(path, folderData, getFolder) {
        if (path.indexOf('.') < 0) {
            if (getFolder) {
                return _.find(folderData, (o) => o.n && o.n.toLowerCase() === path.toLowerCase()).i;
            }
            return _.find(folderData, (o) => o.get && o.get('name').toLowerCase() === path.toLowerCase());
        }
        path = path.split('.');
        var folder = path.shift();
        path = path.join('.');
        folderData = _.find(folderData, (o) => o.n && o.n.toLowerCase() === folder.toLowerCase());
        return getObjectFromFolder(path, folderData.i);
    }

    /*
    // usage:
    var folderData = getFolderObjects(JSON.parse(Campaign().get('journalfolder')));
    var goblin13 = getObjectFromFolder('encounters.forest.level2.goblin #13', folderData);
    var level2PlainsMonsters = getObjectFromFolder('encounters.plains.level2', folderData, true);
    var randomLevel2PlainsMonster = _.shuffle(level2PlainsMonsters).shift();
    */
}

class MenuHelper {
    constructor() 
    {
        this.MENU_STYLE = "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px; ";
        this.BUTTON_STYLE = "background-color: #1b70e0; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; ";
        this.LIST_STYLE = "list-style: none; padding: 0; margin: 0; margin-bottom: 20px; overflow:hidden; ";
        this.ITEM_STYLE = "overflow:hidden;";
    }

    makeTitle(title, title_tag) {
        title_tag = (title_tag && title_tag !== '') ? title_tag : 'h3';
        return '<' + title_tag + ' style="margin-bottom: 10px;">' + title + '</' + title_tag+'>';
    }

    makeButton(title, href, addStyle, alt) {
        return '<a style="'+ this.BUTTON_STYLE + addStyle + '" href="' + href + '" title="' + (alt || href) + '">' + title + '</a>';
    }

    makeListLabel(itemName, addStyle) {
        return '<span style="float: left; ' + addStyle + '">' + itemName + '</span> ';
    }

    makeListButton(buttonName, href, addButtonStyle, alt) {
        return this.makeButton(buttonName, href,  "float: right; " + addButtonStyle, alt);
    }

    makeList(items, addListStyle, addItemStyle) {
        let list = '<ul style="' + this.LIST_STYLE + addListStyle + '">';
        items.forEach((item) => {
            list += '<li style="' + this.ITEM_STYLE + addItemStyle + '">' + item + '</li>';
        });
        list += '</ul>';
        return list;
    }

    showMenu(who, contents, title, settings) {
        settings = settings || {};
        settings.whisper = (typeof settings.whisper === 'undefined') ? '/w gm ' : '/w ' + settings.whisper;
        title = (title && title != '') ? this.makeTitle(title, settings.title_tag || '') : '';
        sendChat(who, settings.whisper + '<div style="' + this.MENU_STYLE + '">' + title + contents + '</div>', null, {noarchive:true});
    }
}

class WildShapeMenu extends MenuHelper
{
    constructor() {
        super();
        this.CMD = {};
        this.CMD["ROOT"]            = API.CMD.ROOT + API.CMD.SEP;
        this.CMD["CONFIG"]          = this.CMD.ROOT + API.CMD.CONFIG;
        this.CMD["CONFIG_ADD"]      = this.CMD.CONFIG + API.CMD.SEP + API.CMD.ADD + API.CMD.SEP;
        this.CMD["CONFIG_REMOVE"]   = this.CMD.CONFIG + API.CMD.SEP + API.CMD.REMOVE + API.CMD.SEP;
        this.CMD["CONFIG_EDIT"]     = this.CMD.CONFIG + API.CMD.SEP + API.CMD.EDIT + API.CMD.SEP;
        this.CMD["CONFIG_RESET"]    = this.CMD.CONFIG + API.CMD.SEP + API.CMD.RESET;

        this["SHAPE_SIZES"] = API.SHAPE_SIZES.join("|");
    }

    showEditShape(shifterKey, shapeKey) {
        const cmdShapeEdit = this.CMD.CONFIG_EDIT + API.FIELDS.TARGET.SHAPE + API.CMD.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + API.FIELDS.TARGET.SHIFTER + API.CMD.SEP;

        const shifter = state[API.STATENAME][API.DATA_SHIFTERS][shifterKey];

        let obj = shifter[API.FIELDS.SHAPES][shapeKey];
        let listItems = [];
        if(obj)
        {
            listItems.push(this.makeListLabel("Name: &lt;" + shapeKey + "&gt;") + this.makeListButton("Edit", cmdShapeEdit + shifterKey + API.CMD.SEP + shapeKey + API.CMD.SEP + API.FIELDS.NAME + API.CMD.SEP + "?{Edit Name|" + shapeKey + "}"));
            listItems.push(this.makeListLabel("Character: &lt;" + obj[API.FIELDS.CHARACTER] + "&gt;") + this.makeListButton("Edit", cmdShapeEdit + shifterKey + API.CMD.SEP + shapeKey + API.CMD.SEP + API.FIELDS.CHARACTER + API.CMD.SEP + "?{Edit Character|" + obj[API.FIELDS.CHARACTER] + "}"));
            listItems.push(this.makeListLabel("Size: " + obj[API.FIELDS.SIZE]) + this.makeListButton("Edit", cmdShapeEdit + shifterKey + API.CMD.SEP + shapeKey + API.CMD.SEP + API.FIELDS.SIZE + API.CMD.SEP + "?{Edit Size|" + this["SHAPE_SIZES"] + "}"));
        }

        const deleteShapeButton = this.makeButton("Delete Shape", cmdRemove + "?{Are you sure?|no|yes}" + API.CMD.SEP + API.FIELDS.TARGET.SHAPE + API.CMD.SEP + shifterKey + API.CMD.SEP + shapeKey, ' width: 100%');
        const editShifterButton = this.makeButton("Edit Shifter: " + shifterKey, cmdShifterEdit + shifterKey, ' width: 100%');

        let contents = this.makeList(listItems) + '<hr>' + deleteShapeButton + '<hr>' + editShifterButton;
        this.showMenu(API.NAME, contents, API.NAME + ': ' + shifterKey + " - " + shapeKey);
    }

    showEditShifter(shifterKey) {
        const cmdShapeEdit = this.CMD.CONFIG_EDIT + API.FIELDS.TARGET.SHAPE + API.CMD.SEP;
        const cmdShapeAdd = this.CMD.CONFIG_ADD + API.FIELDS.TARGET.SHAPE + API.CMD.SEP;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + API.FIELDS.TARGET.SHIFTER + API.CMD.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;

        const obj = state[API.STATENAME][API.DATA_SHIFTERS][shifterKey];
        const objSettings = obj[API.FIELDS.SETTINGS];
        const objShapes = obj[API.FIELDS.SHAPES];

        let listItems = [];
        listItems.push(this.makeListLabel("<p style='font-size: 120%'><b>Settings:</b></p>"));
        let listSettings = [];
        {
            listSettings.push(this.makeListLabel("Token Name: &lt;" + shifterKey + "&gt;") + this.makeListButton("Edit", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.NAME + API.CMD.SEP + "?{Edit Name|" + shifterKey + "}"));
            listSettings.push(this.makeListLabel("Character: &lt;" + objSettings[API.FIELDS.CHARACTER]+"&gt;") + this.makeListButton("Edit", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.CHARACTER + API.CMD.SEP + "?{Edit Character|" + objSettings[API.FIELDS.CHARACTER] + "}"));
            listSettings.push(this.makeListLabel("Size: &lt;" + objSettings[API.FIELDS.SIZE] + "&gt;") + this.makeListButton("Edit", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.SIZE + API.CMD.SEP + "?{Edit Size|" + this["SHAPE_SIZES"] + "}"));
            listSettings.push(this.makeListLabel("Shapes Prefix: &lt;" + objSettings[API.FIELDS.SHAPE_PREFIX] + "&gt;") + this.makeListButton("Edit", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.SHAPE_PREFIX + API.CMD.SEP + "?{Edit Shapes Prefix" + (!objSettings[API.FIELDS.SHAPE_PREFIX] ? "" : ("|" + objSettings[API.FIELDS.SHAPE_PREFIX])) + "}"));
            listSettings.push(this.makeListLabel("Is Druid: &lt;" + objSettings[API.FIELDS.ISDRUID] + "&gt;") + this.makeListButton("Toggle", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.ISDRUID));
        }
        listItems.push(this.makeList(listSettings, " padding-left: 10px"));

        listItems.push(this.makeListLabel("<p style='font-size: 120%'><b>Shapes:</b></p>") + this.makeListButton("Add Shape", cmdShapeAdd + shifterKey + API.CMD.SEP + "?{Shape Name}"));
        let listShapes = [];
        {
            _.each(objShapes, (value, key) =>
            {
                listShapes.push(this.makeListLabel(key) + this.makeListButton("Edit", cmdShapeEdit + shifterKey + API.CMD.SEP + key));
            });
        }
        listItems.push(this.makeList(listShapes, " padding-left: 10px"));

        const deleteShifterButton = this.makeButton("Delete: " + shifterKey, cmdRemove + "?{Are you sure?|no|yes}" + API.CMD.SEP + API.FIELDS.TARGET.SHIFTER + API.CMD.SEP + shifterKey, ' width: 100%');
        const showShiftersButton = this.makeButton("Show ShapeShifters", this.CMD.ROOT + API.CMD.SHOW_SHIFTERS, ' width: 100%');

        let contents = this.makeList(listItems) + deleteShifterButton + '<hr>' + showShiftersButton;
        this.showMenu(API.NAME, contents, API.NAME + ': ' + shifterKey);
    }

    showShifters() {
        const cmdShifterAdd = this.CMD.CONFIG_ADD + API.FIELDS.TARGET.SHIFTER + API.CMD.SEP;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + API.FIELDS.TARGET.SHIFTER + API.CMD.SEP;

        let listItems = [];
        _.each(state[API.STATENAME][API.DATA_SHIFTERS], (value, key) => {
            listItems.push(this.makeListLabel(key) + this.makeListButton("Edit", cmdShifterEdit + key));
        });

        const addShifterButton = this.makeButton("Add ShapeShifter", cmdShifterAdd + "?{Token Name}" + API.CMD.SEP + "?{Character Name in Journal}", ' width: 100%');
        const configButton = this.makeButton("Main Menu", this.CMD.CONFIG, ' width: 100%');

        let contents = this.makeList(listItems) + addShifterButton + '<hr>' + configButton;
        this.showMenu(API.NAME, contents, API.NAME + ': ShapeShifters');
    }

    showConfigMenu(first) {
        const apiCmdBase = this.CMD.ROOT;

        const showShiftersButton = this.makeButton("Display ShapeShifters", apiCmdBase + API.CMD.SHOW_SHIFTERS, ' width: 100%');

        let listItems = [
            this.makeListLabel("Commands Separator: '" + API.CMD.SEP + "'"),
            this.makeListLabel("Please make sure your names/strings don't include the separator used by the API", "font-size: 80%"),
        ];

        //const exportButton = this.makeButton('Export Config', this.CMD.CONFIG + API.CMD.SEP + API.CMD.EXPORT, ' width: 100%');
        //const importButton = this.makeButton('Import Config', this.CMD.CONFIG + API.CMD.SEP + API.CMD.IMPORT + API.CMD.SEP + '?{Config}', ' width: 100%');
        const resetButton = this.makeButton('Reset Config', this.CMD.CONFIG_RESET, ' width: 100%');

        let title_text = API.NAME + ((first) ? ': First Time Setup' : ': Config');
        let contents = showShiftersButton
                        + '<hr>' + this.makeList(listItems)
                        + '<hr>' + resetButton;

        this.showMenu(API.NAME, contents, title_text);
    }

    showShapeShiftMenu(who, shifterKey, shapes) {
        const cmdShapeShift = this.CMD.ROOT + API.CMD.SHIFT + API.CMD.SEP + shifterKey + API.CMD.SEP;

        let buttons = this.makeButton(shifterKey, cmdShapeShift + API.DEFAULT_SHAPE, ' width: 100%');
        
        _.each(shapes, (value, key) => {
            buttons += this.makeButton(key, cmdShapeShift + key, ' width: 100%');
        });

        this.showMenu(API.NAME, buttons, API.NAME + ': ' + shifterKey + ' ShapeShift', {whisper: who});
    }
}


var WildShape = WildShape || (function() {
    'use strict';
    const MENU = new WildShapeMenu();
    const UTILS = new Utils();

    const sortByKey = (unordered) => {
        let ordered = {};
        _.each(Object.keys(unordered).sort(function(a, b){return a.toLowerCase().localeCompare(b.toLowerCase());}), (key) => {
            ordered[key] = unordered[key];
        });

        return ordered;
    };

    const sortShifters = () => {
        // order shifters
        state[API.STATENAME][API.DATA_SHIFTERS] = sortByKey(state[API.STATENAME][API.DATA_SHIFTERS]);
    };

    const sortShapes = (shifter) => {
        // order shapes
        shifter[API.FIELDS.SHAPES] = sortByKey(shifter[API.FIELDS.SHAPES]);
    };

    const getCreatureSize = (targetSize) => {        
        return targetSize ? Math.max(_.indexOf(API.SHAPE_SIZES, targetSize.toLowerCase()), 0) : 0;
    };

    const findShapeShifter = (selectedToken) => {
        let tokenObj = getObj(selectedToken._type, selectedToken._id);
        
        //const id = tokenObj.get("represents");
        //const targetKey = _.findKey(state[API.STATENAME][API.DATA_SHIFTERS], function(s) { return s[API.FIELDS.SETTINGS][API.FIELDS.ID] == id; });
        //if (targetKey)

        const targetKey = tokenObj.get("name");
        const target = state[API.STATENAME][API.DATA_SHIFTERS][targetKey];

        if(target)
        {
            
            const targetCharacter = findObjs({ type: 'character', id: target[API.FIELDS.SETTINGS][API.FIELDS.ID] })[0];

            if(targetCharacter)
            {
                return {
                    token: tokenObj,
                    shifterKey: targetKey,
                    shifter: target,
                    shifterCharacter: targetCharacter,
                };
            }
            else
                UTILS.chatError("Cannot find ShapeShifter for token: " + tokenObj.get("name") + ", id : " + id + ", character id: " + target[API.FIELDS.SETTINGS][API.FIELDS.ID]);
        }
        else
            UTILS.chatError("Cannot find ShapeShifter for token: " + targetKey);

        return null;
    };

    const doShapeShift = (who, obj, targetShapeObj) => {
        /*
        {
            token: tokenObj,
            shifterKey: targetKey,
            shifter: target,
            shifterCharacter: targetCharacter,
        };
*/
        if(targetShapeObj)
        {
            const targetName = obj.shifter[API.FIELDS.SETTINGS][API.FIELDS.SHAPE_PREFIX] + targetShapeObj[API.FIELDS.CHARACTER];
            const targetCharacter = findObjs({ type: 'character', name: targetName })[0];
            if (!targetCharacter)
            {
                UTILS.chatErrorToPlayer(who, "Cannot find target character = " + targetName);
                return false;
            }
            const targetCharacterId = targetCharacter.get('id');

            if(getAttrByName(targetCharacterId, 'npc', 'current') == 1)
            {
                const targetImg = UTILS.getCleanImgsrc(targetCharacter.get('avatar'));
                if (targetImg === undefined)
                {
                    UTILS.chatErrorToPlayer(who, "the NPC avatar needs to be re-uploaded into the library and set on the target character; cannot use marketplace link");
                    return false;
                }

                let targetSize =  getCreatureSize(targetShapeObj[API.FIELDS.SIZE]);
                if (targetSize === 0)
                {
                    targetSize = getAttrByName(targetCharacterId, "token_size");
                    if(!targetSize)
                        targetSize = 1;
                }

                if (API.DEBUG)
                {
                    UTILS.chat("====== TARGET STATS ======");
                    UTILS.chat("token_size = " + getAttrByName(targetCharacterId, "token_size"));
                    UTILS.chat("controlledby = " + obj.shifterCharacter.get("controlledby"));
                    UTILS.chat("avatar = " + targetImg);
                    UTILS.chat("hp = " + getAttrByName(targetCharacterId, 'hp', 'max'));
                    UTILS.chat("ac = " + getAttrByName(targetCharacterId, 'npc_ac'));
                    UTILS.chat("npc speed = " + getAttrByName(targetCharacterId, 'npc_speed'));
                    UTILS.chat("npc speed bar = " + getAttrByName(targetCharacterId, 'npc_speed').split(' ')[0]);
                }

                if (obj.shifter[API.FIELDS.SETTINGS][API.FIELDS.ISDRUID])
                {
                    sendChat("copy attributes");

                    const copyAttrNames = ["intelligence", "wisdom", "charisma"];
                    const copyAttrVariations = ["", "_base", "_mod", "_save_bonus"];

                    _.each(copyAttrNames, function (attrName) {
                        _.each(copyAttrVariations, function (attrVar) {
                            UTILS.copyAttribute(obj.shifter[API.FIELDS.SETTINGS][API.FIELDS.ID], targetCharacterId, attrName + attrVar, "", "", false);
                        });
                    });
/*
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
                }

                const shifterControlledBy = obj.shifterCharacter.get("controlledby");
                targetCharacter.set({controlledby: shifterControlledBy, inplayerjournals: shifterControlledBy});
                
                obj.token.set({
                    imgsrc: targetImg,
                    represents: targetCharacterId,
                    bar1_link: 'None',
                    bar1_value: getAttrByName(targetCharacterId, 'hp', 'max'),
                    bar1_max: getAttrByName(targetCharacterId, 'hp', 'max'),
                    bar2_link: 'None',
                    bar2_value: getAttrByName(targetCharacterId, 'npc_ac'),
                    bar3_link: 'None',
                    bar3_value: getAttrByName(targetCharacterId, 'npc_speed').split(' ')[0],
                    height: 70 * targetSize,
                    width: 70 * targetSize,
                });

                return true;
            }
            else
            {
                UTILS.chatErrorToPlayer(who, "Cannot shift into a non-pc character");
                return false;
            }
        }
        else
        {
            const targetCharacter = obj.shifterCharacter;
            const targetCharacterId = obj.shifter[API.FIELDS.SETTINGS][API.FIELDS.ID];
            let targetSize = getCreatureSize(obj.shifter[API.FIELDS.SETTINGS][API.FIELDS.SIZE]);

            // auto doesn't work on characters for now
            if (targetSize == 0)
                targetSize = 1;

            targetCharacter.get('_defaulttoken', function(defaulttoken) {
                let tokenImg;
                const dt = JSON.parse(defaulttoken);
                if (dt)
                {
                    tokenImg = UTILS.getCleanImgsrc(dt.imgsrc);
                }
                else
                {
                    tokenImg = UTILS.getCleanImgsrc(targetCharacter.get('avatar'));
                }

                obj.token.set({
                    imgsrc: tokenImg,
                    represents: targetCharacterId,
                    bar1_value: getAttrByName(targetCharacterId, "hp", 'current'),
                    bar1_max: getAttrByName(targetCharacterId, "hp", 'max'),
                    bar1_link: findObjs({type: "attribute", characterid: targetCharacterId, name: 'hp'})[0].id,
                    bar2_value: getAttrByName(targetCharacterId, "ac", 'current'),
                    bar2_link: findObjs({type: "attribute", characterid: targetCharacterId, name: 'ac'})[0].id,
                    bar3_value: getAttrByName(targetCharacterId, "speed", 'current'),
                    bar3_link: findObjs({type: "attribute", characterid: targetCharacterId, name: 'speed'})[0].id,
                    height: 70 * targetSize,
                    width: 70 * targetSize,
                });
            });

            return true;
        }
    };

    const handleInput = (msg) => {
        if (msg.type === "api")
        {
            if (msg.content.indexOf(API.CMD.ROOT) == 0)
            {
                const args = msg.content.split(API.CMD.SEP);
                args.shift(); // remove API.CMD.ROOT
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
                            UTILS.chatToPlayer(msg.who, API.CMD.USAGE);
                        }
                        return;
                    }

                    const obj = findShapeShifter(msg.selected[0]);
                    if (obj)
                    {
                        const controlledby = obj.shifterCharacter.get("controlledby");
                        if (playerIsGM(msg.playerid) || controlledby.search(msg.playerid) >= 0 || controlledby.search("all") >= 0)
                        {
                            MENU.showShapeShiftMenu(msg.who, obj.shifterKey, obj.shifter[API.FIELDS.SHAPES]);
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

                    if (cmd == API.CMD.SHIFT)
                    {
                        const shifterName = args.shift();
                        const shapeName = args.shift();

                        let shape = null;

                        const obj = findShapeShifter(msg.selected[0]);
                        if(obj)
                        {
                            const controlledby = obj.shifterCharacter.get("controlledby");
                            if (playerIsGM(msg.playerid) || controlledby.search(msg.playerid) >= 0 || controlledby.search("all") >= 0)
                            {
                                if (shapeName.toLowerCase() != API.DEFAULT_SHAPE)
                                {
                                    const shape = obj.shifter[API.FIELDS.SHAPES][shapeName];
                                    if (shape)
                                    {
                                        if (doShapeShift(msg.who, obj, shape))
                                            sendChat("character|"+obj.shifterCharacter.get("id"), "Transforming into " + shapeName);
                                    }
                                    else
                                    {
                                        UTILS.chatErrorToPlayer(msg.who, "Cannot find shape " + shapeName + " for ShapeShifter: " + obj.tokenName);
                                    }
                                }
                                else
                                {
                                    if (doShapeShift(msg.who, obj))
                                        sendChat("character|"+obj.shifterCharacter.get("id"), "Transforming back into " + obj.shifterKey);
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
                            case API.CMD.SHOW_SHIFTERS:
                            {
                                MENU.showShifters();
                            }
                            break;

                            case API.CMD.CONFIG:
                            {
                                switch (args.shift())
                                {
                                    case API.CMD.ADD:
                                    {
                                        switch (args.shift())
                                        {
                                            case API.FIELDS.TARGET.SHIFTER:
                                            {
                                                const targetID = args.shift();
                                                if (targetID && targetID.length > 0)
                                                {
                                                    let targetName = targetID; 
                                                    let target = state[API.STATENAME][API.DATA_SHIFTERS][targetID];
                                                    if(!target)
                                                    {
                                                        let charName = args.shift().trim();
                                                        let charObj = findObjs({ type: 'character', name: charName });
                                                        if(charObj && charObj.length == 1)
                                                        {
                                                            target = {};

                                                            let targetSettings = {};
                                                            targetSettings[API.FIELDS.ID] = charObj[0].get('id');
                                                            targetSettings[API.FIELDS.CHARACTER] = charName;
                                                            targetSettings[API.FIELDS.SIZE] = API.DEFAULT_SHIFTER_SIZE;
                                                            targetSettings[API.FIELDS.SHAPE_PREFIX] = "";
                                                            targetSettings[API.FIELDS.ISDRUID] = true;

                                                            target[API.FIELDS.SETTINGS] = targetSettings;
                                                            target[API.FIELDS.SHAPES] = {};

                                                            state[API.STATENAME][API.DATA_SHIFTERS][targetID] = target;

                                                            sortShifters();
                                                            MENU.showShifters();
                                                        }
                                                        else
                                                        {
                                                            UTILS.chatError("Cannot find character [" + charName + "] in the journal");
                                                        }

                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to add ShapeShifter " + targetName + " which already exists");
                                                    }
                                                }
                                                else
                                                {
                                                    UTILS.chatError("Trying to add ShapeShifter without a name");
                                                }
                                            }
                                            break;

                                            case API.FIELDS.TARGET.SHAPE:
                                            {
                                                const targetName = args.shift();
                                                const targetShapeID = args.shift().trim();
                                                if (targetShapeID && targetShapeID.length > 0)
                                                {
                                                    let target = state[API.STATENAME][API.DATA_SHIFTERS][targetName];                    
                                                    if (target) 
                                                    {
                                                        let targetShapeName = targetShapeID;

                                                        let shape = {};
                                                        shape[API.FIELDS.ID] = "";
                                                        shape[API.FIELDS.CHARACTER] = targetShapeName;
                                                        shape[API.FIELDS.SIZE] = API.DEFAULT_SHAPE_SIZE;
                                                        target[API.FIELDS.SHAPES][targetShapeID] = shape;

                                                        sortShapes(target);

                                                        MENU.showEditShifter(targetName);
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to add shape to ShapeShifter " + targetName + " which doesn't exist");
                                                        MENU.showShifters();
                                                    }
                                                }
                                            }
                                            break;
                                        }
                                    }                                
                                    break;

                                    case API.CMD.REMOVE:
                                    {
                                        if (args.shift() == 'no')
                                            return;

                                        switch (args.shift())
                                        {
                                            case API.FIELDS.TARGET.SHIFTER:
                                            {
                                                const targetName = args.shift();
                                                if (targetName)
                                                {
                                                    if(state[API.STATENAME][API.DATA_SHIFTERS][targetName])
                                                    {
                                                        delete state[API.STATENAME][API.DATA_SHIFTERS][targetName];
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to delete ShapeShifter " + targetName + " which doesn't exists");
                                                    }

                                                }
                                                else
                                                {
                                                    UTILS.chatError("Trying to delete a ShapeShifter without providing a name");
                                                }

                                                MENU.showShifters();
                                            }
                                            break;

                                            case API.FIELDS.TARGET.SHAPE:
                                            {
                                                const targetName = args.shift();
                                                const targetShape = args.shift();
                                                let target = state[API.STATENAME][API.DATA_SHIFTERS][targetName];
                                                if (target) 
                                                {
                                                    if (target[API.FIELDS.SHAPES][targetShape])
                                                    {
                                                        delete target[API.FIELDS.SHAPES][targetShape];
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to remove shape " + targetShape + " that doesn't exist from ShapeShifter " + targetName);
                                                    }

                                                    MENU.showEditShifter(targetName);
                                                }
                                                else
                                                {
                                                    UTILS.chatError("Trying to remove shape from ShapeShifter " + targetName + " which doesn't exist");
                                                    MENU.showShifters();
                                                }
                                            }
                                            break;
                                        }
                                    }
                                    break;

                                    case API.CMD.EDIT:
                                    {
                                        switch (args.shift())
                                        {
                                            case API.FIELDS.TARGET.SHIFTER:
                                            {
                                                let targetName = args.shift();
                                                let target = state[API.STATENAME][API.DATA_SHIFTERS][targetName];
                                                if (target)
                                                {
                                                    const field = args.shift();
                                                    if (field)
                                                    {
                                                        let isValueSet = false;
                                                        let newValue = args.shift();
                                                        if(field == API.FIELDS.NAME)
                                                        {
                                                            let oldTargetName = targetName; 
                                                            targetName = newValue.trim();

                                                            if (targetName && targetName.length > 0)
                                                            {
                                                                state[API.STATENAME][API.DATA_SHIFTERS][targetName] = target;
                                                                delete state[API.STATENAME][API.DATA_SHIFTERS][oldTargetName];
                                                                sortShifters();
                                                                isValueSet = true;
                                                            }
                                                        }
                                                        else if(field == API.FIELDS.CHARACTER)
                                                        {
                                                            let charObj = findObjs({ type: 'character', name: newValue });
                                                            if(charObj && charObj.length == 1)
                                                            {
                                                                target[API.FIELDS.SETTINGS][API.FIELDS.ID] = charObj[0].get('id');
                                                                target[API.FIELDS.SETTINGS][field] = newValue;
                                                                isValueSet = true;
                                                            }
                                                            else
                                                            {
                                                                UTILS.chatError("Cannot find character [" + newValue + "] in the journal");
                                                            }
                                                        }
                                                        else if(field == API.FIELDS.ISDRUID)
                                                        {

                                                            target[API.FIELDS.SETTINGS][API.FIELDS.ISDRUID] = !target[API.FIELDS.SETTINGS][API.FIELDS.ISDRUID];
                                                            isValueSet = true;
                                                        }
                                                        else
                                                        {
                                                            target[API.FIELDS.SETTINGS][field] = newValue;
                                                            isValueSet = true;
                                                        }

                                                        if(isValueSet)
                                                            MENU.showEditShifter(targetName);
                                                    }
                                                    else
                                                        MENU.showEditShifter(targetName);
                                                }
                                                else
                                                {
                                                    UTILS.chatError("cannot find shifter [" + targetName + "]");
                                                }
                                            }
                                            break;

                                            case API.FIELDS.TARGET.SHAPE:
                                            {
                                                const targetName = args.shift();
                                                let target = state[API.STATENAME][API.DATA_SHIFTERS][targetName];
                                                if (target)
                                                {
                                                    let shapeName = args.shift();
                                                    let targetShape = target[API.FIELDS.SHAPES][shapeName];
                                                    if (targetShape)
                                                    {
                                                        const field = args.shift();
                                                        if (field)
                                                        {
                                                            let newValue = args.shift();
                                                            if(field == API.FIELDS.NAME)
                                                            {
                                                                let oldShapeName = shapeName; 
                                                                shapeName = newValue.trim();
                                                                if (shapeName && shapeName.length > 0)
                                                                {
                                                                    target[API.FIELDS.SHAPES][shapeName] = targetShape;
                                                                    delete target[API.FIELDS.SHAPES][oldShapeName];
                                                                    sortShapes(target);
                                                                }
                                                            }
                                                            else
                                                            {
                                                                targetShape[field] = newValue;
                                                            }
                                                        }
                                                        MENU.showEditShape(targetName, shapeName);
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("cannot find shape [" + shapeName + "]");
                                                    }
                                                }
                                                else
                                                {
                                                    UTILS.chatError("cannot find shifter [" + targetName + "]");
                                                }

                                            }
                                        }
                                    }
                                    break;

                                    case API.CMD.RESET:
                                    {
                                        setDefaults(true);
                                    }
                                    break;

                                    default: MENU.showConfigMenu();
                                }
                            }
                            break;

                            case API.CMD.HELP:
                            {
                                UTILS.chat(API.CMD.USAGE);
                            }
                            break;
                        }
                    }
                }
            }
        }
    };

    const setDefaults = (reset) => {
        let defaults = {};

        defaults[API.DATA_CONFIG] = {
            version: API.VERSION,
        };
        defaults[API.DATA_SHIFTERS] = {};

        // set test data
        // defaults[API.DATA_SHIFTERS] = ShapeShiftersExample;

        if (!state[API.STATENAME][API.DATA_CONFIG] || reset) {
            state[API.STATENAME][API.DATA_CONFIG] = defaults[API.DATA_CONFIG];
        }

        if (!state[API.STATENAME][API.DATA_SHIFTERS] || typeof state[API.STATENAME][API.DATA_SHIFTERS] !== 'object' || reset)
        {
            state[API.STATENAME][API.DATA_SHIFTERS] = defaults[API.DATA_SHIFTERS];

            // order shifters
            sortShifters();

            // initialize default IDs
            _.each(state[API.STATENAME][API.DATA_SHIFTERS], function(s) {
                if (s[API.FIELDS.SETTINGS][API.FIELDS.ID] === undefined || reset)
                {
                    let obj = findObjs({ type: 'character', name: s[API.FIELDS.SETTINGS][API.FIELDS.CHARACTER] });
                    if(obj && obj.length == 1)
                    {
                        s[API.FIELDS.SETTINGS][API.FIELDS.ID] = obj[0].get('id');
                    }
                    else
                    {
                        UTILS.chatError("trying to initialize invalid character: " + s[API.FIELDS.SETTINGS][API.FIELDS.CHARACTER]);
                    }
                }

                // order shapes
                sortShapes(s);
            });
        }

        if (!state[API.STATENAME].hasOwnProperty('firsttime') || reset) {
            MENU.showConfigMenu(true);
            state[API.STATENAME].firsttime = false;
        }            
    };

    const checkInstall = () => {
        if(!_.has(state, API.STATENAME)){
            state[API.STATENAME] = state[API.STATENAME] || {};
        }
        setDefaults();

        log(API.NAME + ' Ready! Usage: ' + API.CMD.USAGE);
    };

    const registerEventHandlers = () => {
        on('chat:message', handleInput);
    };

    return {
        checkInstall,
        registerEventHandlers,
    };
})();


on('ready', () => { 
    'use strict';

    WildShape.checkInstall();
    WildShape.registerEventHandlers();
});