/*

importing a monster from the MonsterManual:
- make a copy and optionally add a prefix for your shapeshifter to its name
- open the monster and download its avatar 
- re-add the image to the library
- set the image from the library as the monster avatar

*/

var ShapeShiftersExample =
{
  Helia: { // this needs to match the "visible name" of you character token
    character: "1 Copy of Helia", // character name in the journal
    shapesPrefix: "Helia-",      //  prefix used on all journal entries for this character shapes
    size: "gargantuan",             // optional, string in ["normal", "large", "huge", "gargantuan"], null defaults to normal

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
      character: "Copy of Lavinia",
      shapesPrefix: "Lavinia-",
      size: "normal",             // optional, string in ["normal", "large", "huge", "gargantuan"], null defaults to normal

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
}

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
        CHARACTER: "character",
        SHAPE_PREFIX: "shapesPrefix",
        SIZE: "size",
    }
}

class MenuHelper {
    constructor() 
    {
        this.MENU_STYLE = "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;";
        this.BUTTON_STYLE = "background-color: #1b70e0; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center;";
        this.LIST_STYLE = "list-style: none; padding: 0; margin: 0; margin-bottom: 20px; overflow:hidden;";
        this.ITEM_STYLE = "overflow:hidden;";
    }

    makeTitle(title, title_tag) {
        title_tag = (title_tag && title_tag !== '') ? title_tag : 'h3';
        return '<' + title_tag + ' style="margin-bottom: 10px;">' + title + '</' + title_tag+'>';
    }

    makeButton(title, href, addStyle, style, alt) {
        return '<a style="'+ (style || this.BUTTON_STYLE) + addStyle + '" href="' + href + '" title="' + (alt || href) + '">' + title + '</a>';
    }

    makeListLabel(itemName, addStyle) {
        return '<span style="float: left; ' + addStyle + '">' + itemName + '</span> ';
    }

    makeListButton(buttonName, href, addButtonStyle, buttonStyle, alt) {
        return this.makeButton(buttonName, href,  "float: right; " + addButtonStyle, buttonStyle, alt);
    }

    makeList(items, addListStyle, addItemStyle, listStyle, itemStyle) {
        let list = '<ul style="' + (listStyle || this.LIST_STYLE) + addListStyle + '">';
        items.forEach((item) => {
            list += '<li style="' + (itemStyle || this.ITEM_STYLE) + addItemStyle + '">' + item + '</li>';
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
        this.CMD["CONFIG_ROOT"]     = this.CMD.ROOT + API.CMD.CONFIG;
        this.CMD["CONFIG_ADD"]      = this.CMD.CONFIG_ROOT + API.CMD.SEP + API.CMD.ADD + API.CMD.SEP;
        this.CMD["CONFIG_REMOVE"]   = this.CMD.CONFIG_ROOT + API.CMD.SEP + API.CMD.REMOVE + API.CMD.SEP;
        this.CMD["CONFIG_EDIT"]     = this.CMD.CONFIG_ROOT + API.CMD.SEP + API.CMD.EDIT + API.CMD.SEP;
        this.CMD["CONFIG_RESET"]    = this.CMD.CONFIG_ROOT + API.CMD.SEP + API.CMD.RESET;
        
        this["SHAPE_SIZES"] = API.SHAPE_SIZES.join("|");
    }
    
    showShapeShift(shifterKey, shapes) {
        let buttons = this.makeButton(shifterKey, this.CMD.ROOT + API.DEFAULT_SHAPE, ' width: 100%');;

        _.each(shapes, function(value, key) {
            buttons += this.makeButton(key, this.CMD.ROOT + key, ' width: 100%');
        });
        
        this.showMenu(API.NAME, buttons, API.NAME + ': ' + shifterKey + ' ShapeShift');
    };

    showEditShape(shifterKey, shapeKey) {
        const cmdShapeEdit = this.CMD.CONFIG_EDIT + API.FIELDS.TARGET.SHAPE + API.CMD.SEP;
        const cmdRemove = this.CMD.CONFIG_REMOVE;
        const cmdShifterEdit = this.CMD.CONFIG_EDIT + API.FIELDS.TARGET.SHIFTER + API.CMD.SEP;
        
        const shifter = state[API.STATENAME][API.DATA_SHIFTERS][shifterKey];
        
        let obj = shifter[API.FIELDS.SHAPES][shapeKey];
        let listItems = [];
        if(obj)
        {
            listItems.push(this.makeListLabel("ID: &lt;" + shapeKey + "&gt;") + this.makeListButton("Edit", cmdShapeEdit + shifterKey + API.CMD.SEP + shapeKey + API.CMD.SEP + API.FIELDS.ID + API.CMD.SEP + "?{Edit ID|" + shapeKey + "}"));
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

        let listItems = [];
        listItems.push(this.makeListLabel("<p style='font-size: 120%'><b>Settings:</b></p>"));
        let listSettings = [];
        {
            listSettings.push(this.makeListLabel("ID: &lt;" + shifterKey + "&gt;") + this.makeListButton("Edit", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.ID + API.CMD.SEP + "?{Edit ID|" + shifterKey + "}"));
            listSettings.push(this.makeListLabel("Character: &lt;" + obj[API.FIELDS.CHARACTER]+"&gt;") + this.makeListButton("Edit", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.CHARACTER + API.CMD.SEP + "?{Edit Character|" + obj[API.FIELDS.CHARACTER] + "}"));
            listSettings.push(this.makeListLabel("Size: &lt;" + obj[API.FIELDS.SIZE] + "&gt;") + this.makeListButton("Edit", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.SIZE + API.CMD.SEP + "?{Edit Size|" + this["SHAPE_SIZES"] + "}"));
            listSettings.push(this.makeListLabel("Shapes Prefix: &lt;" + obj[API.FIELDS.SHAPE_PREFIX] + "&gt;") + this.makeListButton("Edit", cmdShifterEdit + shifterKey + API.CMD.SEP + API.FIELDS.SHAPE_PREFIX + API.CMD.SEP + "?{Edit Shapes Prefix" + (!obj[API.FIELDS.SHAPE_PREFIX] ? "" : ("|" + obj[API.FIELDS.SHAPE_PREFIX])) + "}"));
        }
        listItems.push(this.makeList(listSettings, " padding-left: 10px"));
        
        listItems.push(this.makeListLabel("<p style='font-size: 120%'><b>Shapes:</b></p>") + this.makeListButton("Add Shape", cmdShapeAdd + shifterKey + API.CMD.SEP + "?{Shape Name}"));
        let listShapes = [];
        {
          _.each(obj[API.FIELDS.SHAPES], (value, key) =>
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
        
        const addShifterButton = this.makeButton("Add ShapeShifter", cmdShifterAdd + "?{Name}", ' width: 100%');;
        const configButton = this.makeButton("Config", this.CMD.CONFIG_ROOT, ' width: 100%');;
        
        let contents = this.makeList(listItems) + '<hr>' + addShifterButton + '<hr>' + configButton;
        this.showMenu(API.NAME, contents, API.NAME + ': ShapeShifters');
    }
    
    sendConfigMenu(first) {
        let apiCmdBase = this.CMD.ROOT;
        
        let listItems = [
            this.makeListLabel("Display Command Usage") + this.makeListButton("Help", apiCmdBase + API.CMD.HELP),
            
        ];
        
        const showShiftersButton = this.makeButton("Display ShapeShifters", apiCmdBase + API.CMD.SHOW_SHIFTERS, ' width: 100%');
        const configButton = this.makeButton('Config', this.CMD.CONFIG_ROOT, ' width: 100%');
        const exportButton = this.makeButton('Export Config', this.CMD.CONFIG_ROOT + API.CMD.SEP + API.CMD.EXPORT, ' width: 100%');
        const importButton = this.makeButton('Import Config', this.CMD.CONFIG_ROOT + API.CMD.SEP + API.CMD.IMPORT + API.CMD.SEP + '?{Config}', ' width: 100%');
        const resetButton = this.makeButton('Reset Config', this.CMD.CONFIG_RESET, ' width: 100%');

        let title_text = API.NAME + ((first) ? ': First Time Setup' : ': Config');
        let contents = this.makeList(listItems)
                      + '<hr>' + showShiftersButton
                      + '<hr>' + configButton
                      + '<hr><p style="font-size: 80%">You can always open this config by typing `' + API.CMD.ROOT + ' config`.</p><hr>'
                      + exportButton + importButton + resetButton;

        this.showMenu(API.NAME, contents, title_text)
    };
    
}

var WildShape = WildShape || (function() {
    'use strict';
    const MENU = new WildShapeMenu();

    const sortByKey = (unordered) => {
        let ordered = {};
        _.each(Object.keys(unordered).sort(function(a, b){return a.toLowerCase().localeCompare(b.toLowerCase())}), (key) => {
            ordered[key] = unordered[key];
        });
        
        return ordered;
    };

    const sortShifters = () => {
        // order shifters
        state[API.STATENAME][API.DATA_SHIFTERS] = sortByKey(state[API.STATENAME][API.DATA_SHIFTERS]);
    }

    const sortShapes = (shifter) => {
        // order shapes
        shifter[API.FIELDS.SHAPES] = sortByKey(shifter[API.FIELDS.SHAPES]);
    }

    const getCleanImgsrc = (imgsrc) => {
        let parts = imgsrc.match(/(.*\/images\/.*)(thumb|med|original|max)([^\?]*)(\?[^?]+)?$/);
        if(parts) {
            return parts[1]+'thumb'+parts[3]+(parts[4]?parts[4]:`?${Math.round(Math.random()*9999999)}`);
        }
        return;
    };


    const duplicateCharacter = (o) => {
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
    };
    
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
    const getCharactersWithAttrByName = (attributeName) => {
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
    };

/*var charsWithPN = getCharactersWithAttrByName('player-name');
_.each(charsWithPN,(o)=>{
  log(`Character ${o.char.get('name')} has player-name of ${o['player-name'].get('current')}/${o['player-name'].get('max')}`);
});*/
    
    const getFolderObjects = (objs) => {
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
    
    const getObjectFromFolder = (path, folderData, getFolder) => {
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

    const findShapeShifter = (selectedToken) => {
        let tokenObj = getObj(selectedToken._type, selectedToken._id);
        const name = tokenObj.get("name");
        const obj = state[API.STATENAME][API.DATA_SHIFTERS][name];
        if (obj)
        {
            return {
                token: tokenObj,
                tokenName: name,
                target: obj
                
            };
        }
        else
        {
            sendChat(API.NAME, "Cannot find selected ShapeShifter: " + name);
        }
        
        return null
    };
    
    const getCreatureSize = (targetSize) => {        
        return targetSize ? Math.max(_.indexOf(API.SHAPE_SIZES, targetSize.toLowerCase()), 0) : 0;
    };
    
    function copyAttribute(fromId, toId, fromAttrName, onlyIfGreater = true, createAttr = false, toPrefix, toSuffix)
    {
        if(!toPrefix)
            toPrefix = "";
        if(!toSuffix)
            toSuffix = "";

        const toAttrName = toPrefix + fromAttrName + toSuffix;
        
        //sendChat(API.NAME, "setting attribute: " + toAttrName + ", from: " + fromAttrName);
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
                sendChat(API.NAME, "ERROR: Cannot find attribute " + toAttrName + " on character " + toId)
            }
        }
    	else if(!onlyIfGreater || toAttr.get("current") < fromAttr)
            toAttr.set("current", fromAttr);
    };

    function shapeShift(selectedToken, settings, targetShapeObj)
    {
        const defaultCharacter = findObjs({ type: 'character', name: settings[API.FIELDS.CHARACTER] })[0];
        if (!defaultCharacter)
        {
            sendChat(API.NAME, "ERROR: cannot find default character = " + settings[API.FIELDS.CHARACTER]);
            return;
        }
        
        if(targetShapeObj)
        {
            const targetName = settings[API.FIELDS.SHAPE_PREFIX] + targetShapeObj[API.FIELDS.CHARACTER];
            const targetCharacter = findObjs({ type: 'character', name: targetName })[0];
            if (!targetCharacter)
            {
                sendChat(API.NAME, "ERROR: cannot find target character = " + targetName);
                return;
            }
            const targetCharacterId = targetCharacter.get('id');

            if(getAttrByName(targetCharacterId, 'npc', 'current') == 1)
            {
                const targetImg = getCleanImgsrc(targetCharacter.get('avatar'));
                if (targetImg === undefined)
                {
                    sendChat(API.NAME, "ERROR: the NPC avatar needs to be re-uploaded into the library and set on the target character; cannot use marketplace link");
                    return;
                }

                let targetSize =  getCreatureSize(targetShapeObj[API.FIELDS.SIZE]);
                if (targetSize === 0)
                {                
                    targetSize = getAttrByName(targetCharacterId, "token_size");
                }
                
                if (API.DEBUG)
                {
                    sendChat(API.NAME, "====== TARGET STATS ======");
                    sendChat(API.NAME, "token_size = " + getAttrByName(targetCharacterId, "token_size"));
                    sendChat(API.NAME, "controlledby = " + defaultCharacter.get("controlledby"));
                    sendChat(API.NAME, "avatar = " + targetImg);
                    sendChat(API.NAME, "hp = " + getAttrByName(targetCharacterId, 'hp', 'max'));
                    sendChat(API.NAME, "ac = " + getAttrByName(targetCharacterId, 'npc_ac'));
                    sendChat(API.NAME, "npc speed = " + getAttrByName(targetCharacterId, 'npc_speed'));
                    sendChat(API.NAME, "npc speed bar = " + getAttrByName(targetCharacterId, 'npc_speed').split(' ')[0]);
                }
                
                const copyAttrNames = ["intelligence", "wisdom", "charisma"]
                const copyAttrVariations = ["", "_base", "_mod", "_save_bonus"]
                
                _.each(copyAttrNames, function (attrName) {
                    _.each(copyAttrVariations, function (attrVar) {
                        copyAttribute(settings[API.FIELDS.ID], targetCharacterId, attrName + attrVar, false);
                    });
                });
                
                //npc_saving_flag: 1
                // npc_str/dex/con/wis/int/cha_save + _flag
                
                //copyAttrNames = ["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", 
                //                 "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"];
                //copyAttrVariations = ["_prof"]
                //_.each(copyAttrNames, function (attrName) {
                //    _.each(copyAttrVariations, function (attrVar) {
                //        copyDruidAttribute(targetCharacterId, attrName + attrVar);
                //    });
                //});
                
                targetCharacter.set({controlledby: defaultCharacter.get("controlledby")});
                
                selectedToken.set({
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
            }
            else
                sendChat(API.NAME, "Cannot shift into a non-pc character");
        }
        else
        {
            const targetCharacter = defaultCharacter;
            const targetCharacterId = settings[API.FIELDS.ID];
            let targetSize = getCreatureSize(settings[API.FIELDS.SIZE]);

            // auto doesn't work on characters for now
            if (targetSize == 0)
                targetSize = 1;

	        targetCharacter.get('_defaulttoken', function(defaulttoken){
	            let tokenImg;
	            const dt = JSON.parse(defaulttoken);
	            if (dt)
	            {
	                tokenImg = getCleanImgsrc(dt.imgsrc);
	            }
	            else
	            {
	                tokenImg = getCleanImgsrc(targetCharacter.get('avatar'));
	            }
            
	            selectedToken.set({
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
                        sendChat(API.NAME, "Please select a token then run: " + API.CMD.ROOT);
                        return;
                    }

                    const obj = findShapeShifter(msg.selected[0]);
                    MENU.showShapeShift(obj.tokenName, obj.target[API.FIELDS.SHAPES]);
                    return;
                }
                else // is GM
                {          
                    let cmd = args.shift();
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
                                            const targetID = args.shift().trim();
                                            if (targetID && targetID.length > 0)
                                            {
                                                let targetName = targetID; 
                                                let target = state[API.STATENAME][API.DATA_SHIFTERS][targetID];
                                                if(!target)
                                                {
                                                    target = {};
                                                    target[API.FIELDS.CHARACTER] = targetName;
                                                    target[API.FIELDS.SIZE] = API.DEFAULT_SHIFTER_SIZE;
                                                    target[API.FIELDS.SHAPE_PREFIX] = "";
                                                    target[API.FIELDS.SHAPES] = {};
                                                    state[API.STATENAME][API.DATA_SHIFTERS][targetID] = target;

                                                    sortShifters();
                                                }
                                                else
                                                {
                                                    sendChat(API.NAME, "ERROR: Trying to add ShapeShifter " + targetName + " which already exists");
                                                }
                                            }
                                            else
                                            {
                                                sendChat(API.NAME, "ERROR: Trying to add ShapeShifter without a name");
                                            }
                                            
                                            MENU.showShifters();
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
                                                    
                                                    let shape = {}
                                                    shape[API.FIELDS.CHARACTER] = targetShapeName;
                                                    shape[API.FIELDS.SIZE] = API.DEFAULT_SHAPE_SIZE;
                                                    target[API.FIELDS.SHAPES][targetShapeID] = shape;
                                                    
                                                    sortShapes(target);

                                                    MENU.showEditShifter(targetName);
                                                }
                                                else
                                                {
                                                    sendChat(API.NAME, "ERROR: Trying to add shape to ShapeShifter " + targetName + " which doesn't exist");
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
                                                    sendChat(API.NAME, "ERROR: Trying to delete ShapeShifter " + targetName + " which doesn't exists");
                                                }

                                            }
                                            else
                                            {
                                                sendChat(API.NAME, "ERROR: Trying to delete a ShapeShifter without providing a name");
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
                                                    sendChat(API.NAME, "ERROR: Trying to remove shape " + targetShape + " that doesn't exist from ShapeShifter " + targetName);
                                                }
                                                
                                                MENU.showEditShifter(targetName);
                                            }
                                            else
                                            {
                                                sendChat(API.NAME, "ERROR: Trying to remove shape from ShapeShifter " + targetName + " which doesn't exist");
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
                                                    let newValue = args.shift();
                                                    if(field == API.FIELDS.ID)
                                                    {
                                                        let oldTargetName = targetName; 
                                                        targetName = newValue.trim();
    
                                                        if (targetName && targetName.length > 0)
                                                        {
                                                            state[API.STATENAME][API.DATA_SHIFTERS][targetName] = target;
                                                            delete state[API.STATENAME][API.DATA_SHIFTERS][oldTargetName];
                                                            sortShifters();
                                                        }
                                                    }
                                                    else
                                                    {
                                                        target[field] = newValue;
                                                    }
                                                }
    
                                                MENU.showEditShifter(targetName);
                                            }
                                            else
                                            {
                                                sendChat(API.NAME, "ERROR: cannot find shifter [" + targetName + "]");
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
                                                        if(field == API.FIELDS.ID)
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
                                                    sendChat(API.NAME, "ERROR: cannot find shape [" + shapeName + "]");
                                                }
                                            }
                                            else
                                            {
                                                sendChat(API.NAME, "ERROR: cannot find shifter [" + targetName + "]");
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
                                
                                default: MENU.sendConfigMenu();
                            }
                        }
                        break;

                        case API.CMD.HELP:
                        {
                            sendChat(API.NAME, API.CMD.USAGE);
                        }
                        break;

                        default:
                        {
                            // reconstruct target shape name from list of arguments
                            const targetShapeName = cmd + " " + args.join(" ");

                            if (!msg.selected)
                            {
                                sendChat(API.NAME, "Please select a token then run: " + API.CMD.USAGE);
                                return;
                            }
                            
                            let targetDruidShape = null;
                            _.each(msg.selected, function(o) 
                            {
                                const obj = findShapeShifter(o);
                                if(obj)
                                {
                                    if (params.toLowerCase() != API.DEFAULT_SHAPE)
                                    {
                                        const targetDruidShape = obj.target[API.FIELDS.SHAPES][targetShapeName];
                                        if (targetDruidShape)
                                        {
                                            sendChat(API.NAME, obj.tokenName + " is transforming into: " + targetDruidShape[API.FIELDS.CHARACTER]);
                                            shapeShift(obj.token, obj.target, targetDruidShape);
                                        }
                                        else
                                        {
                                            sendChat(API.NAME, "ERROR: Cannot find shape " + targetShapeName + " for ShapeShifter: " + obj.tokenName);
                                        }
                                    }
                                    else
                                    {
                                        sendChat(API.NAME,  obj.tokenName + " is transforming back into the default shape");
                                        shapeShift(obj.token, obj.target);
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }
    };

    const setDefaults = (reset) => {
        let defaults = {}
        
        defaults[API.DATA_CONFIG] = {
            version: API.VERSION,
        }
        defaults[API.DATA_SHIFTERS] = {}

        defaults[API.DATA_SHIFTERS] = ShapeShiftersExample;

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
                if (s[API.FIELDS.ID] === undefined || reset)
                {
                    let obj = findObjs({ type: 'character', name: s[API.FIELDS.CHARACTER] });
                    if(obj && obj.length == 1)
                    {
                        s[API.FIELDS.ID] = obj[0].get('id');
                    }
                    else
                    {
                        sendChat(API.NAME, "trying to initialize invalid character: " + s[API.FIELDS.CHARACTER]);
                    }
                }

                // order shapes
                sortShapes(s);
            });
        }

        if (!state[API.STATENAME].hasOwnProperty('firsttime') || reset) {
            MENU.sendConfigMenu(true);
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
