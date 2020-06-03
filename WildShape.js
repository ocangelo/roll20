/*

importing a monster from the MonsterManual:
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
            size: "gargantuan",             // optional, string in ["normal", "large", "huge", "gargantuan"], null defaults to normal
            isdruid: true,
            isnpc: false,
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
            size: "normal",             // optional, string in ["normal", "large", "huge", "gargantuan"], null defaults to normal
            isdruid: true,
            isnpc: false,
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

const WS_API = {
    NAME : "WildShape",
    VERSION : "0.1",
    STATENAME : "WILDSHAPE",
    DEBUG : false,

    // storage in the state
    DATA_CONFIG : "config",
    DATA_SHIFTERS : "shifters",

    // general info
    DEFAULTS : {
        SHAPE : "default",
        SHIFTER_SIZE : "normal",
        SHAPE_SIZE : "auto",
        ISDRUID : true,
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
        SEP : '--', // separator used in commands
        USAGE : "Please select a token then run: !ws",

        HELP : "help",

        CONFIG : "config",
        ADD : "add",
        REMOVE : "remove",
        EDIT : "edit",
        RESET : "reset",
        IMPORT : "import",

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
        SIZE: "size",
        ISDRUID: "isdruid",
        ISNPC: "isnpc",
        CURRENT_FORM: "currform",
        NPC_HP: "npchp",
    }
};

class WildUtils {
    constructor(name) {
        this.apiName = name || "API";
    }

    chat(msg) {
        sendChat(this.apiName, "/w gm " + msg);
    }

    chatToPlayer(playerid, msg) {
        sendChat(this.apiName, "/w " + playerid + " " + msg);
    }

    chatError(msg) {
        sendChat(this.apiName, "/w gm ERROR: " + msg);
    }

    chatErrorToPlayer(playerid, msg) {
        sendChat(this.apiName, "/w " + playerid + " ERROR: " + msg);
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

        //this.chat("setting attribute: " + toAttrName + ", from: " + fromAttrName);
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
                this.chatError("Cannot find attribute " + toAttrName + " on character " + toId);
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

    getCharactersWithAttr(attributeName) {
        /* start the chain with all the attribute objects named 'player-name' */
        return _
        .chain(filterObjs((o)=>{
            return (o.get('type')==='attribute' && o.get('name') === attributeName);
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

        /*var charsWithPN = getCharactersWithAttrByName('player-name');
        _.each(charsWithPN,(o)=>{
            log(`Character ${o.char.get('name')} has player-name of ${o['player-name'].get('current')}/${o['player-name'].get('max')}`);
        });*/
    }

    getCharactersWithAttrValue(attribute, value) {
        return (this.getCharactersWithAttrByName(attribute) || {}).filter( (o)=> {return o[attribute].get('current') == value; } );
    }

    getPCs() {
        return this.getCharactersWithAttr("ideals");
    }

    getNPCs() {
        return this.getCharactersWithAttr("npc");
    }

    getPCNames() {
        return this.getPCs().reduce((m,o)=>{m.push(o.char.get('name')); return m; }, []);             
    }

    getNPCNames() {
        return this.getNPCs().reduce((m,o)=>{m.push(o.char.get('name')); return m; }, []);
    }


    findNestedFolder(folderData, name) {
       
        var folderStack = [];
        folderStack.push(folderData);
        
        _.each(folderStack.pop(), function(obj) {
            if(_.isObject(obj))
            {
                if (obj.n.toLowerCase() === name.toLowerCase()) {
                    return obj;
                }
                else
                {
                    folderStack.push(obj.i);
                }
            }
        });

        return [];
/*
        var targetFolder;

        _.each(folderData, function(obj) {
            if (!_.isObject(obj) || targetFolder) return;
            if (obj.n.toLowerCase() === name.toLowerCase()) {
                targetFolder = obj;
                return;
            }
            targetFolder = this.findNestedFolder(obj.i, name);
        });
        return targetFolder;
        */
    }

    getCharactersInFolder(folder) {
        var folderData = JSON.parse(Campaign().get('journalfolder'));
        var charactersInFolder = _.chain(this.findNestedFolder(folderData, folder).i)
            .filter(function(obj) { return _.isString(obj); })
            .map(function(id) { return getObj('character', id); })
            .reject(function(char) { return !char; })
            .value();
        sendChat("test", JSON.stringify(charactersInFolder));
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
}

class WildMenuHelper {
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

class WildShapeMenu extends WildMenuHelper
{
    constructor() {
        super();
        this.UTILS = new WildUtils(WS_API.NAME);
        this.CMD = {};
        this.CMD.ROOT            = WS_API.CMD.ROOT + WS_API.CMD.SEP;
        this.CMD.CONFIG          = this.CMD.ROOT + WS_API.CMD.CONFIG;
        this.CMD.CONFIG_ADD      = this.CMD.CONFIG + WS_API.CMD.SEP + WS_API.CMD.ADD + WS_API.CMD.SEP;
        this.CMD.CONFIG_REMOVE   = this.CMD.CONFIG + WS_API.CMD.SEP + WS_API.CMD.REMOVE + WS_API.CMD.SEP;
        this.CMD.CONFIG_EDIT     = this.CMD.CONFIG + WS_API.CMD.SEP + WS_API.CMD.EDIT + WS_API.CMD.SEP;
        this.CMD.CONFIG_RESET    = this.CMD.CONFIG + WS_API.CMD.SEP + WS_API.CMD.RESET;

        this.SHAPE_SIZES = WS_API.SHAPE_SIZES.join("|");
    }

    makeListLabelValue(name, value, defaultValue = '')
    {
        return this.makeListLabel(name + ": &lt;" + (value || defaultValue) + "&gt;");
    }

    showEditShape(shifterKey, shapeKey) {
        const cmdShapeEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHAPE + WS_API.CMD.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHIFTER + WS_API.CMD.SEP;

        const shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];

        var npcs = this.UTILS.getNPCNames().sort().join('|');

        let obj = shifter[WS_API.FIELDS.SHAPES][shapeKey];
        let listItems = [];
        if(obj)
        {
            listItems.push(this.makeListLabelValue("Name", shapeKey) + this.makeListButton("Edit", cmdShapeEdit + shifterKey + WS_API.CMD.SEP + shapeKey + WS_API.CMD.SEP + WS_API.FIELDS.NAME + WS_API.CMD.SEP + "?{Edit Name|" + shapeKey + "}"));
            listItems.push(this.makeListLabelValue("Character", obj[WS_API.FIELDS.CHARACTER]) + this.makeListButton("Edit", cmdShapeEdit + shifterKey + WS_API.CMD.SEP + shapeKey + WS_API.CMD.SEP + WS_API.FIELDS.CHARACTER + WS_API.CMD.SEP + "?{Edit Character|" + npcs + "}"));
            listItems.push(this.makeListLabelValue("Size", obj[WS_API.FIELDS.SIZE]) + this.makeListButton("Edit", cmdShapeEdit + shifterKey + WS_API.CMD.SEP + shapeKey + WS_API.CMD.SEP + WS_API.FIELDS.SIZE + WS_API.CMD.SEP + "?{Edit Size|" + this["SHAPE_SIZES"] + "}"));
        }

        const deleteShapeButton = this.makeButton("Delete Shape", cmdRemove + "?{Are you sure?|no|yes}" + WS_API.CMD.SEP + WS_API.FIELDS.TARGET.SHAPE + WS_API.CMD.SEP + shifterKey + WS_API.CMD.SEP + shapeKey, ' width: 100%');
        const editShifterButton = this.makeButton("Edit Shifter: " + shifterKey, cmdShifterEdit + shifterKey, ' width: 100%');

        let contents = this.makeList(listItems) + '<hr>' + deleteShapeButton + '<hr>' + editShifterButton;
        this.showMenu(WS_API.NAME, contents, WS_API.NAME + ': ' + shifterKey + " - " + shapeKey);
    }

    showEditShifter(shifterKey) {
        const cmdShapeEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHAPE + WS_API.CMD.SEP;
        const cmdShapeAdd = this.CMD.CONFIG_ADD + WS_API.FIELDS.TARGET.SHAPE + WS_API.CMD.SEP;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHIFTER + WS_API.CMD.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;
        const cmdImport = this.CMD.ROOT + WS_API.CMD.IMPORT;

        const shifter = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey];
        const shifterSettings = shifter[WS_API.FIELDS.SETTINGS];
        const shifterShapes = shifter[WS_API.FIELDS.SHAPES];

        // get list of pcs and npcs
        const npcs = this.UTILS.getNPCNames().sort().join('|');
        const pcs = this.UTILS.getPCNames().sort().join('|');
        var shifterPcs;
        if (shifterSettings[WS_API.FIELDS.ISNPC])
            shifterPcs = npcs;
        else 
            shifterPcs = pcs;

        // settings section
        let listItems = [];
        listItems.push(this.makeListLabel("<p style='font-size: 120%'><b>Settings" + (shifterSettings[WS_API.FIELDS.ISNPC] ? " <i>(NPC)</i>" : " <i>(PC)</i>")) + ":</b></p>");
        let listSettings = [];
        {
            listSettings.push(this.makeListLabelValue("Token Name", shifterKey) + this.makeListButton("Edit", cmdShifterEdit + shifterKey + WS_API.CMD.SEP + WS_API.FIELDS.NAME + WS_API.CMD.SEP + "&#64;{target|token_name}"));// + "?{Edit Name|" + shifterKey + "}"));
            listSettings.push(this.makeListLabelValue("Character", shifterSettings[WS_API.FIELDS.CHARACTER]) + this.makeListButton("Edit", cmdShifterEdit + shifterKey + WS_API.CMD.SEP + WS_API.FIELDS.CHARACTER + WS_API.CMD.SEP + "?{Edit Character|" + shifterPcs + "}"));
            listSettings.push(this.makeListLabelValue("Size", shifterSettings[WS_API.FIELDS.SIZE]) + this.makeListButton("Edit", cmdShifterEdit + shifterKey + WS_API.CMD.SEP + WS_API.FIELDS.SIZE + WS_API.CMD.SEP + "?{Edit Size|" + this["SHAPE_SIZES"] + "}"));
            listSettings.push(this.makeListLabelValue("Is Druid", shifterSettings[WS_API.FIELDS.ISDRUID], 'false') + this.makeListButton("Toggle", cmdShifterEdit + shifterKey + WS_API.CMD.SEP + WS_API.FIELDS.ISDRUID));
            listSettings.push(this.makeListLabel("Is Druid automatically copies over INT/WIS/CHA attributes", "font-size: 80%"));
        }
        listItems.push(this.makeList(listSettings, " padding-left: 10px"));

        // shapes section
        listItems.push(this.makeListLabel("<p style='font-size: 120%'><b>Shapes:</b></p>") + this.makeListButton("Add", cmdShapeAdd + shifterKey + WS_API.CMD.SEP + "?{Target Shape|" + npcs + "}" + WS_API.CMD.SEP + "?{Simple Name (optional)}"));
        let listShapes = [];
        {
            _.each(shifterShapes, (value, shapeKey) =>
            {
                listShapes.push(this.makeListLabel(shapeKey) + this.makeListButton("Del", cmdRemove + "?{Are you sure?|no|yes}" + WS_API.CMD.SEP + WS_API.FIELDS.TARGET.SHAPE + WS_API.CMD.SEP + shifterKey + WS_API.CMD.SEP + shapeKey) + this.makeListButton("Edit", cmdShapeEdit + shifterKey + WS_API.CMD.SEP + shapeKey));
            });
        }
        listItems.push(this.makeList(listShapes, " padding-left: 10px"));

        // bottom buttons
        const importShapesButton = this.makeButton("Import Shapes", cmdImport + WS_API.CMD.SEP + "?{Folder Name}", ' width: 100%');
        const deleteShifterButton = this.makeButton("Delete: " + shifterKey, cmdRemove + "?{Are you sure?|no|yes}" + WS_API.CMD.SEP + WS_API.FIELDS.TARGET.SHIFTER + WS_API.CMD.SEP + shifterKey, ' width: 100%');
        const showShiftersButton = this.makeButton("Show ShapeShifters", this.CMD.ROOT + WS_API.CMD.SHOW_SHIFTERS, ' width: 100%');

        let contents = this.makeList(listItems) + importShapesButton + deleteShifterButton + '<hr>' + showShiftersButton;
        this.showMenu(WS_API.NAME, contents, WS_API.NAME + ': ' + shifterKey);
    }

    showShifters() {
        const cmdShifterAdd = this.CMD.CONFIG_ADD + WS_API.FIELDS.TARGET.SHIFTER + WS_API.CMD.SEP;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHIFTER + WS_API.CMD.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;

        let listItems = [];
        _.each(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS], (value, shifterKey) => {
            const shifterSettings = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][shifterKey][WS_API.FIELDS.SETTINGS];
            listItems.push(this.makeListLabel(shifterKey + (shifterSettings[WS_API.FIELDS.ISNPC] ? " <i>(NPC)</i>" : " <i>(PC)</i>")) + this.makeListButton("Del", cmdRemove + "?{Are you sure?|no|yes}" + WS_API.CMD.SEP + WS_API.FIELDS.TARGET.SHIFTER + WS_API.CMD.SEP + shifterKey)+ this.makeListButton("Edit", cmdShifterEdit + shifterKey));
        });

        var pcs = this.UTILS.getPCNames().sort().join('|');
        var npcs = this.UTILS.getNPCNames().sort().join('|');

        const addShifterButton = this.makeButton("Add ShapeShifter", cmdShifterAdd + "&#64;{target|token_id}", ' width: 100%');
        const configButton = this.makeButton("Main Menu", this.CMD.CONFIG, ' width: 100%');

        let contents = this.makeList(listItems) + addShifterButton + '<hr>' + configButton;
        this.showMenu(WS_API.NAME, contents, WS_API.NAME + ': ShapeShifters');
    }

    showConfigMenu(first) {
        const apiCmdBase = this.CMD.ROOT;

        const showShiftersButton = this.makeButton("Display ShapeShifters", apiCmdBase + WS_API.CMD.SHOW_SHIFTERS, ' width: 100%');

        let listItems = [
            this.makeListLabelValue("Commands Separator", WS_API.CMD.SEP),
            this.makeListLabel("Please make sure your names/strings don't include the separator used by the API", "font-size: 80%"),
        ];

        //const exportButton = this.makeButton('Export Config', this.CMD.CONFIG + WS_API.CMD.SEP + WS_API.CMD.EXPORT, ' width: 100%');
        //const importButton = this.makeButton('Import Config', this.CMD.CONFIG + WS_API.CMD.SEP + WS_API.CMD.IMPORT + WS_API.CMD.SEP + '?{Config}', ' width: 100%');
        const resetButton = this.makeButton('Reset Config', this.CMD.CONFIG_RESET, ' width: 100%');

        let title_text = WS_API.NAME + ((first) ? ': First Time Setup' : ': Config');
        let contents = showShiftersButton
                        + '<hr>' + this.makeList(listItems)
                        + '<hr>' + resetButton;

        this.showMenu(WS_API.NAME, contents, title_text);
    }

    showShapeShiftMenu(who, playerid, shifterKey, shapes) {
        const cmdShapeShift = this.CMD.ROOT + WS_API.CMD.SHIFT + WS_API.CMD.SEP + shifterKey + WS_API.CMD.SEP;

        let contents = '';

        if (playerIsGM(playerid))
        {
            const cmdShifterEdit = this.CMD.CONFIG_EDIT + WS_API.FIELDS.TARGET.SHIFTER + WS_API.CMD.SEP;
            contents += this.makeButton("Edit", cmdShifterEdit + shifterKey, ' width: 100%') + "<hr>";
        }

        contents += this.makeButton(shifterKey, cmdShapeShift + WS_API.DEFAULTS.SHAPE, ' width: 100%');
        _.each(shapes, (value, key) => {
            contents += this.makeButton(key, cmdShapeShift + key, ' width: 100%');
        });

        this.showMenu(WS_API.NAME, contents, WS_API.NAME + ': ' + shifterKey + ' ShapeShift', {whisper: who});
    }
}


var WildShape = WildShape || (function() {
    'use strict';
    const MENU = new WildShapeMenu();
    const UTILS = new WildUtils(WS_API.NAME);

    const sortByKey = (unordered) => {
        let ordered = {};
        _.each(Object.keys(unordered).sort(function(a, b){return a.toLowerCase().localeCompare(b.toLowerCase());}), (key) => {
            ordered[key] = unordered[key];
        });

        return ordered;
    };

    const sortShifters = () => {
        // order shifters
        state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] = sortByKey(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS]);
    };

    const sortShapes = (shifter) => {
        // order shapes
        shifter[WS_API.FIELDS.SHAPES] = sortByKey(shifter[WS_API.FIELDS.SHAPES]);
    };

    const getCreatureSize = (targetSize) => {        
        return targetSize ? Math.max(_.indexOf(WS_API.SHAPE_SIZES, targetSize.toLowerCase()), 0) : 0;
    };

    const findShapeShifter = (selectedToken) => {
        let tokenObj = getObj(selectedToken._type, selectedToken._id);
        
        //const id = tokenObj.get("represents");
        //const targetKey = _.findKey(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS], function(s) { return s[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] == id; });
        //if (targetKey)

        const targetKey = tokenObj.get("name");
        const target = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][targetKey];

        if(target)
        {
            
            const targetCharacter = findObjs({ type: 'character', id: target[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] })[0];
            if(targetCharacter)
            {
                return {
                    token: tokenObj,
                    shifterKey: targetKey,
                    shifter: target,
                    shifterCharacter: targetCharacter,
                    shifterControlledby: targetCharacter.get("controlledby")
                };
            }
            else
                UTILS.chatError("Cannot find ShapeShifter: " + targetKey + ", character id: " + target[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID]);
        }
        else
            UTILS.chatError("Cannot find ShapeShifter: " + targetKey);

        return null;
    };

    const getCharacterData = (shiftData, isNpc) =>
    {
        let data = {};
        
        let targetImg;
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
            
            const targetData = shiftData.targetShape ? shiftData.targetShape : shiftData.shifter[WS_API.FIELDS.SETTINGS];
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
                targetImg = dt ? UTILS.getCleanImgsrc(dt.imgsrc) : UTILS.getCleanImgsrc(shiftData.targetCharacter.get('avatar'));
            });
            if (targetImg === undefined)
            {
                UTILS.chatErrorToPlayer(shiftData.who, "canont find token or avatar image for PC " + shiftData.targetCharacterId);
                return null;
            }

            targetSize = getCreatureSize(shiftData.shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.SIZE]);
            
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
        data.controlledby = shiftData.shifterControlledby;
        data.tokenSize = targetSize;

        return data;
    };

    const doShapeShift = (shiftData) => {
        const shifterSettings = shiftData.shifter[WS_API.FIELDS.SETTINGS];

        var isTargetNpc = true;
        var isTargetDefault = false;

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

        const targetData = getCharacterData(shiftData, isTargetNpc);
        if (!targetData)
            return false;

        // special handling of NPC ShapeShifter to restore hp when going back to original form, as they don't store the current in hp
        if(shifterSettings[WS_API.FIELDS.ISNPC])
        {
            if (isTargetDefault)
            {
                if (shifterSettings[WS_API.FIELDS.CURRENT_FORM] != WS_API.DEFAULTS.SHAPE)
                {
                    targetData.hp.current = shifterSettings[WS_API.FIELDS.NPC_HP];
                }
                else
                    return false;
            }
            else if (shifterSettings[WS_API.FIELDS.CURRENT_FORM] == WS_API.DEFAULTS.SHAPE)
            {
                // cache current npc hp value
                shifterSettings[WS_API.FIELDS.NPC_HP] = shiftData.token.get("bar1_value");
            }                
        }

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

        if (isTargetNpc)
        {
            if (shifterSettings[WS_API.FIELDS.ISDRUID])
            {
                sendChat("copy attributes");

                const copyAttrNames = ["intelligence", "wisdom", "charisma"];
                const copyAttrVariations = ["", "_base", "_mod", "_save_bonus"];

                _.each(copyAttrNames, function (attrName) {
                    _.each(copyAttrVariations, function (attrVar) {
                        UTILS.copyAttribute(shiftData.shifter[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID], shiftData.targetCharacterId, attrName + attrVar, "", "", false);
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
            }

            shiftData.targetCharacter.set({controlledby: targetData.controlledby, inplayerjournals: targetData.controlledby});

            shiftData.token.set({
                imgsrc: targetData.imgsrc,
                represents: shiftData.targetCharacterId,
                bar1_link: 'None',
                bar1_value: isTargetDefault ? targetData.hp.current : targetData.hp.max,
                bar1_max: targetData.hp.max,
                bar2_link: 'None',
                bar2_value: targetData.ac.current,
                bar3_link: 'None',
                bar3_value: targetData.speed.current.split(' ')[0],
                height: 70 * targetData.tokenSize,
                width: 70 * targetData.tokenSize,
            });        
        }
        else
        {
            shiftData.token.set({
                imgsrc: targetData.imgsrc,
                represents: shiftData.targetCharacterId,
                bar1_value: isTargetDefault ? targetData.hp.current : targetData.hp.max,
                bar1_max: targetData.hp.max,
                bar1_link: isTargetDefault ? targetData.hp.id : 'None',
                bar2_value: targetData.ac.current,
                bar2_link: isTargetDefault ? targetData.ac.id : 'None',
                bar3_value: targetData.speed.current,
                bar3_link: isTargetDefault ? targetData.speed.id : 'None',
                height: 70 * targetData.tokenSize,
                width: 70 * targetData.tokenSize,
            });
        }

        shifterSettings[WS_API.FIELDS.CURRENT_FORM] = shiftData.targetShapeName;
    };

    const handleInput = (msg) => {
        if (msg.type === "api")
        {
            if (msg.content.indexOf(WS_API.CMD.ROOT) == 0)
            {
                const args = msg.content.split(WS_API.CMD.SEP);
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

                    const obj = findShapeShifter(msg.selected[0]);
                    if (obj)
                    {
                        if (playerIsGM(msg.playerid) || obj.shifterControlledby.search(msg.playerid) >= 0 || obj.shifterControlledby.search("all") >= 0)
                        {
                            MENU.showShapeShiftMenu(msg.who, msg.playerid, obj.shifterKey, obj.shifter[WS_API.FIELDS.SHAPES]);
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

                        const obj = findShapeShifter(msg.selected[0]);
                        if(obj)
                        {
                            if (playerIsGM(msg.playerid) || obj.shifterControlledby.search(msg.playerid) >= 0 || obj.shifterControlledby.search("all") >= 0)
                            {
                                if (shapeName.toLowerCase() != WS_API.DEFAULTS.SHAPE)
                                {
                                    const shape = obj.shifter[WS_API.FIELDS.SHAPES][shapeName];
                                    if (shape)
                                    {
                                        obj.who = msg.who;
                                        obj.targetShapeName = shapeName;
                                        obj.targetShape = shape;
                                        if (doShapeShift(obj))
                                            sendChat("character|" + obj.shifterCharacter.get("id"), "Transforming into " + shapeName);
                                    }
                                    else
                                    {
                                        UTILS.chatErrorToPlayer(msg.who, "Cannot find shape " + shapeName + " for ShapeShifter: " + obj.tokenName);
                                    }
                                }
                                else
                                {
                                    obj.who = msg.who;
                                    obj.targetShapeName = WS_API.DEFAULTS.SHAPE;
                                    if (doShapeShift(obj))
                                        sendChat("character|" + obj.shifterCharacter.get("id"), "Transforming back into " + obj.shifterKey);
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
                                                const tokenName = tokenObj ? tokenObj.get("name") : null;
                                                if (tokenName && tokenName.length > 0)
                                                {
                                                    let target = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][tokenName];
                                                    if(!target)
                                                    {
                                                        const charId = tokenObj.get("represents");
                                                        let charObj = findObjs({ type: 'character', id: charId });
                                                        if(charObj && charObj.length == 1)
                                                        {
                                                            const isNpc = (getAttrByName(charId, 'npc', 'current') == 1);

                                                            target = {};
                                                            
                                                            let targetSettings = {};
                                                            targetSettings[WS_API.FIELDS.ID] = charId;
                                                            targetSettings[WS_API.FIELDS.CHARACTER] = charObj[0].get('name');
                                                            targetSettings[WS_API.FIELDS.SIZE] = isNpc ? WS_API.DEFAULTS.SHAPE_SIZE : WS_API.DEFAULTS.SHIFTER_SIZE;
                                                            targetSettings[WS_API.FIELDS.ISDRUID] = !isNpc;
                                                            targetSettings[WS_API.FIELDS.ISNPC] = isNpc;
                                                            targetSettings[WS_API.FIELDS.CURRENT_FORM] = WS_API.DEFAULTS.SHAPE;

                                                            target[WS_API.FIELDS.SETTINGS] = targetSettings;
                                                            target[WS_API.FIELDS.SHAPES] = {};

                                                            state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][tokenName] = target;

                                                            sortShifters();
                                                            MENU.showEditShifter(tokenName);
                                                        }
                                                        else
                                                        {
                                                            UTILS.chatError("Cannot find character with id [" + charId + "] in the journal");
                                                        }

                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to add ShapeShifter " + tokenName + " which already exists");
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
                                                const tokenName = args.shift();
                                                const targetShapeName = args.shift();
                                                let targetShapeID = args.shift().trim();
                                                if (targetShapeName && targetShapeName.length > 0)
                                                {
                                                    let target = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][tokenName];
                                                    if (target)
                                                    {
                                                        let shapeObj = findObjs({ type: 'character', name: targetShapeName });
                                                        if(shapeObj && shapeObj.length == 1)
                                                        {
                                                            let shape = {};
                                                            shape[WS_API.FIELDS.ID] = shapeObj[0].get('id');
                                                            shape[WS_API.FIELDS.CHARACTER] = targetShapeName;
                                                            shape[WS_API.FIELDS.SIZE] = WS_API.DEFAULTS.SHAPE_SIZE;

                                                            targetShapeID = targetShapeID || targetShapeName;
                                                            target[WS_API.FIELDS.SHAPES][targetShapeID] = shape;

                                                            sortShapes(target);

                                                            MENU.showEditShifter(tokenName);
                                                        }
                                                        else
                                                        {
                                                            UTILS.chatError("Cannot find character [" + charName + "] in the journal");
                                                        }
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to add shape to ShapeShifter " + tokenName + " which doesn't exist");
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
                                                const targetName = args.shift();
                                                if (targetName)
                                                {
                                                    if(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][targetName])
                                                    {
                                                        delete state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][targetName];
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

                                            case WS_API.FIELDS.TARGET.SHAPE:
                                            {
                                                const tokenName = args.shift();
                                                const targetShape = args.shift();
                                                let target = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][tokenName];
                                                if (target) 
                                                {
                                                    if (target[WS_API.FIELDS.SHAPES][targetShape])
                                                    {
                                                        delete target[WS_API.FIELDS.SHAPES][targetShape];
                                                    }
                                                    else
                                                    {
                                                        UTILS.chatError("Trying to remove shape " + targetShape + " that doesn't exist from ShapeShifter " + tokenName);
                                                    }

                                                    MENU.showEditShifter(tokenName);
                                                }
                                                else
                                                {
                                                    UTILS.chatError("Trying to remove shape from ShapeShifter " + tokenName + " which doesn't exist");
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
                                                let tokenName = args.shift();
                                                let target = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][tokenName];
                                                if (target)
                                                {
                                                    const field = args.shift();
                                                    if (field)
                                                    {
                                                        let isValueSet = false;
                                                        let newValue = args.shift();
                                                        if(field == WS_API.FIELDS.NAME)
                                                        {
                                                            let oldTokenName = tokenName; 
                                                            tokenName = newValue.trim();

                                                            if (tokenName && tokenName.length > 0)
                                                            {
                                                                if(!state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][tokenName])
                                                                {
                                                                    state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][tokenName] = target;
                                                                    delete state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][oldTokenName];
                                                                    sortShifters();
                                                                    isValueSet = true;
                                                                }
                                                                else
                                                                {
                                                                    UTILS.chatError("Trying to add ShapeShifter " + tokenName + " which already exists");
                                                                }
                                                            }
                                                        }
                                                        else if(field == WS_API.FIELDS.CHARACTER)
                                                        {
                                                            let charObj = findObjs({ type: 'character', name: newValue });
                                                            if(charObj && charObj.length == 1)
                                                            {
                                                                target[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] = charObj[0].get('id');
                                                                target[WS_API.FIELDS.SETTINGS][field] = newValue;
                                                                isValueSet = true;
                                                            }
                                                            else
                                                            {
                                                                UTILS.chatError("Cannot find character [" + newValue + "] in the journal");
                                                            }
                                                        }
                                                        else if(field == WS_API.FIELDS.ISDRUID)
                                                        {

                                                            target[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ISDRUID] = !target[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ISDRUID];
                                                            isValueSet = true;
                                                        }
                                                        else
                                                        {
                                                            target[WS_API.FIELDS.SETTINGS][field] = newValue;
                                                            isValueSet = true;
                                                        }

                                                        if(isValueSet)
                                                            MENU.showEditShifter(tokenName);
                                                    }
                                                    else
                                                        MENU.showEditShifter(tokenName);
                                                }
                                                else
                                                {
                                                    UTILS.chatError("cannot find shifter [" + tokenName + "]");
                                                }
                                            }
                                            break;

                                            case WS_API.FIELDS.TARGET.SHAPE:
                                            {
                                                const tokenName = args.shift();
                                                let target = state[WS_API.STATENAME][WS_API.DATA_SHIFTERS][tokenName];
                                                if (target)
                                                {
                                                    let shapeName = args.shift();
                                                    let targetShape = target[WS_API.FIELDS.SHAPES][shapeName];
                                                    if (targetShape)
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
                                                                    targetShape[WS_API.FIELDS.ID] = shapeObj[0].get('id');
                                                                    const oldCharacterName = targetShape[field];
                                                                    targetShape[field] = newValue;
                                                                    isValueSet = true;
                                                                    
                                                                    if (oldCharacterName == shapeName)
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
                                                                let oldShapeName = shapeName; 
                                                                shapeName = newValue.trim();
                                                                if (shapeName && shapeName.length > 0)
                                                                {
                                                                    if(!target[WS_API.FIELDS.SHAPES][shapeName])
                                                                    {
                                                                        target[WS_API.FIELDS.SHAPES][shapeName] = targetShape;
                                                                        delete target[WS_API.FIELDS.SHAPES][oldShapeName];
                                                                        sortShapes(target);
                                                                        isValueSet = true;
                                                                    }
                                                                    else
                                                                    {
                                                                        UTILS.chatError("Trying to add shape " + shapeName + " which already exists");
                                                                    }
                                                                }
                                                            }
                                                            else if(!isValueSet)
                                                            {
                                                                targetShape[field] = newValue;
                                                                isValueSet = true;
                                                            }

                                                            if (isValueSet)
                                                                MENU.showEditShape(tokenName, shapeName);
                                                        }
                                                        else
                                                        {
                                                            MENU.showEditShape(tokenName, shapeName);
                                                        }
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

                                    case WS_API.CMD.RESET:
                                    {
                                        setDefaults(true);
                                    }
                                    break;

                                    default: MENU.showConfigMenu();
                                }
                            }
                            break;

                            case WS_API.CMD.IMPORT:
                            {
                                const folderName = args.shift();
                                UTILS.chat(folderName);
                                var folderCharacters = UTILS.getCharactersInFolder(folderName);
                                _.each(folderCharacters, function(obj) {
                                    UTILS.chat(obj.get("name"));
                                });
/*
// usage:
var folderData = getFolderObjects('journalfolder');
var goblin13 = getObjectFromFolder('encounters.forest.level2.goblin #13', folderData);
var level2PlainsMonsters = getObjectFromFolder('encounters.plains.level2', folderData, true);
var randomLevel2PlainsMonster = _.shuffle(level2PlainsMonsters).shift();
*/

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
        let defaults = {};

        defaults[WS_API.DATA_CONFIG] = {
            version: WS_API.VERSION,
        };
        defaults[WS_API.DATA_SHIFTERS] = {};

        // set test data
        // defaults[WS_API.DATA_SHIFTERS] = ShapeShiftersExample;

        if (!state[WS_API.STATENAME][WS_API.DATA_CONFIG] || reset) {
            state[WS_API.STATENAME][WS_API.DATA_CONFIG] = defaults[WS_API.DATA_CONFIG];
        }

        if (!state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] || typeof state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] !== 'object' || reset)
        {
            state[WS_API.STATENAME][WS_API.DATA_SHIFTERS] = defaults[WS_API.DATA_SHIFTERS];

            // order shifters
            sortShifters();

            // initialize default IDs
            _.each(state[WS_API.STATENAME][WS_API.DATA_SHIFTERS], function(s) {
                if (s[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] === undefined || reset)
                {
                    let obj = findObjs({ type: 'character', name: s[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.CHARACTER] });
                    if(obj && obj.length == 1)
                    {
                        s[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.ID] = obj[0].get('id');
                    }
                    else
                    {
                        UTILS.chatError("trying to initialize invalid character: " + s[WS_API.FIELDS.SETTINGS][WS_API.FIELDS.CHARACTER]);
                    }
                }

                // order shapes
                sortShapes(s);
            });
        }

        if (!state[WS_API.STATENAME].hasOwnProperty('firsttime') || reset) {
            MENU.showConfigMenu(true);
            state[WS_API.STATENAME].firsttime = false;
        }            
    };

    const checkInstall = () => {
        if(!_.has(state, WS_API.STATENAME)){
            state[WS_API.STATENAME] = state[WS_API.STATENAME] || {};
        }
        setDefaults();

        log(WS_API.NAME + ' Ready! Usage: ' + WS_API.CMD.USAGE);
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