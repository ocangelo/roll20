/*

importing a monster from the MonsterManual:
- make a copy and optionally add a prefix for your shapeshifter to its name
- open the monster and download its avatar 
- re-add the image to the library
- set the image from the library as the monster avatar


add your data to the ShapeShifter object:

ShapeShifter = {

    ShifterCharacter_1: { // this needs to match the "visible name" of you character token
        default: {
            name: string // character name in the journal
            shapesPrefix: string //  prefix used on all journal entries for this character shapes
            size: optional, string in ["normal", "large", "huge", "gargantuan"], null  defaults to normal
        },
        
        shapes: {
            shapeID_1: // this matches the input to the !ws command
            {
                name: string // default name of the creature in the journal (ignoring the prefix),
                size: string // optional, ["normal", "large", "huge", "gargantuan"], null defaults to NPC token_size attribute
            },
            
            shapeID_2: {
                ...
            },
            
            ...
        }
    },

    ShifterCharacter_2: { // add your other shapeshifter name here and fill in the data...
        default: {
            ...
        },
        
        shapes: {
            ...
        }
    },
    
    ...
};
*/

var MenuHelper = MenuHelper || (function () {
    var MENU_STYLE = "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;";
    var BUTTON_STYLE = "background-color: #1b70e0; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center;";
    var LIST_STYLE = 'list-style: none; padding: 0; margin: 0;';
    var ITEM_STYLE = "";

    makeTitle = (title, title_tag) => {
        title_tag = (title_tag && title_tag !== '') ? title_tag : 'h3';
        return '<'+title_tag+' style="margin-bottom: 10px;">'+title+'</'+title_tag+'>';
    };

    makeButton = (title, href, addStyle, style, alt) => {
        return '<a style="'+(style || BUTTON_STYLE) + addStyle +'" href="'+href+'" title="'+(alt || href)+'">'+title+'</a>';
    };

    makeListItemButton = (itemName, buttonName, href, addButtonStyle, buttonStyle, alt) => {
        return '<span style="float: left">'+itemName+':</span> ' + makeButton(buttonName, href,  "float: right;" + addButtonStyle, buttonStyle, alt);
    }

    makeList = (items, addListStyle, addItemStyle, listStyle, itemStyle) => {
        let list = '<ul style="'+(listStyle || LIST_STYLE)+addListStyle+'">';
        items.forEach((item) => {
            list += '<li style="'+(itemStyle || ITEM_STYLE)+addItemStyle+'">'+item+'</li>';
        });
        list += '</ul>';
        return list;
    };
    

    makeAndSendMenu = (who, contents, title, settings) => {
        settings = settings || {};
        settings.whisper = (typeof settings.whisper === 'undefined') ? '/w gm ' : '/w ' + settings.whisper;
        title = (title && title != '') ? makeTitle(title, settings.title_tag || '') : '';
        sendChat(who, settings.whisper + '<div style="'+MENU_STYLE+'">'+title+contents+'</div>', null, {noarchive:true});
    };

    return {
      MENU_STYLE,
      BUTTON_STYLE,
      LIST_STYLE,
      ITEM_STYLE,
      makeTitle,
      makeButton,
      makeListItemButton,
      makeList,
      makeAndSendMenu,
    }
})();


var WildShape = WildShape || (function() {
    'use strict';

    const API_NAME = "WildShape";
    const API_VERSION = "0.1";
    const API_CMD = "!ws";
    const API_USAGE = API_CMD + " [shapeName, config [reset, import, export]]";
    const API_STATENAME = "WILDSHAPE";
    const API_DEBUG = false;

    const sendShapeShiftMenu = (name, shapes) => {
        let buttons = MenuHelper.makeButton(name, "!ws default", ' width: 100%');;
        let listItems = [];
        _.each(Object.keys(shapes), function(key) {
            buttons += MenuHelper.makeButton(key, "!ws " + key, ' width: 100%');
        });
        
        MenuHelper.makeAndSendMenu(API_NAME, buttons, API_NAME + ': ' + name + ' ShapeShift')
    };

    const sendConfigMenu = (first) => {
        let listItems = [
            MenuHelper.makeListItemButton("Display Command Usage", "Help", "!ws help"),
        ];

        let configButton = MenuHelper.makeButton('Config', API_CMD + ' config', ' width: 100%');
        let resetButton = MenuHelper.makeButton('Reset Config', API_CMD + ' config reset', ' width: 100%');
        let exportButton = MenuHelper.makeButton('Export Config', API_CMD + ' config export', ' width: 100%');
        let importButton = MenuHelper.makeButton('Import Config', API_CMD + ' config import ?{Config}', ' width: 100%');

        let title_text = (first) ? API_NAME+' First Time Setup' : API_NAME+' Config';
        let contents = MenuHelper.makeList(listItems, ' overflow:hidden;', ' overflow: hidden')
                      +'<hr>'+configButton+'<hr><p style="font-size: 80%">You can always open this config by typing `'+API_CMD+' config`.</p><hr>'
                      +exportButton+importButton+resetButton;
        MenuHelper.makeAndSendMenu(API_NAME, contents, title_text)
    };
    
    function getCleanImgsrc(imgsrc) {
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
    const getCharactersWithAttrByName = function(attributeName){
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
    
    function getFolderObjects(objs) {
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
    
    function getObjectFromFolder(path, folderData, getFolder) {
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

    function findShapeShifter(selectedToken) {
        let tokenObj = getObj(selectedToken._type, selectedToken._id);
        const name = tokenObj.get("name");
        const obj = state[API_STATENAME].ShapeShifters[name];
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
            sendChat(API_NAME, "Cannot find selected ShapeShifter: " + name);
        }
        
        return null
    };
    
    function getCreatureSize(targetSize)
    {
        const CreatureSizes = [
            "normal",
            "large",
            "huge",
            "gargantuan",
        ];
        
        return 1 + (targetSize ? Math.max(_.indexOf(CreatureSizes, targetSize.toLowerCase()), 0) : 0);
    };
    
    function copyAttribute(fromId, toId, fromAttrName, onlyIfGreater = true, createAttr = false, toPrefix, toSuffix)
    {
        if(!toPrefix)
            toPrefix = "";
        if(!toSuffix)
            toSuffix = "";

        const toAttrName = toPrefix + fromAttrName + toSuffix;
        
        //sendChat(API_NAME, "setting attribute: " + toAttrName + ", from: " + fromAttrName);
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
                sendChat(API_NAME, "ERROR: Cannot find attribute " + toAttrName + " on character " + toId)
            }
        }
    	else if(!onlyIfGreater || toAttr.get("current") < fromAttr)
            toAttr.set("current", fromAttr);
    };

    function shapeShift(selectedToken, defaultShapeObj, targetShapeObj)
    {
        const defaultCharacter = findObjs({ type: 'character', name: defaultShapeObj.name })[0];
        if (!defaultCharacter)
        {
            sendChat(API_NAME, "ERROR: cannot find default character = " + defaultShapeObj.name);
            return;
        }
        
        if(targetShapeObj)
        {
            const targetName = defaultShapeObj.shapesPrefix + targetShapeObj.name;
            const targetCharacter = findObjs({ type: 'character', name: targetName })[0];
            if (!targetCharacter)
            {
                sendChat(API_NAME, "ERROR: cannot find target character = " + targetName);
                return;
            }
            const targetCharacterId = targetCharacter.get('id');

            if(getAttrByName(targetCharacterId, 'npc', 'current') == 1)
            {
                const targetImg = getCleanImgsrc(targetCharacter.get('avatar'));
                if (targetImg === undefined)
                {
                    sendChat(API_NAME, "ERROR: the NPC avatar needs to be re-uploaded into the library and set on the target character; cannot use marketplace link");
                    return;
                }
                
                const targetSize = getAttrByName(targetCharacterId, "token_size");
                if (targetSize === undefined)
                {
                    targetSize =  getCreatureSize(targetShapeObj.size);
                }
                
                if (API_DEBUG)
                {
                    sendChat(API_NAME, "====== TARGET STATS ======");
                    sendChat(API_NAME, "token_size = " + getAttrByName(targetCharacterId, "token_size"));
                    sendChat(API_NAME, "controlledby = " + defaultCharacter.get("controlledby"));
                    sendChat(API_NAME, "avatar = " + targetImg);
                    sendChat(API_NAME, "hp = " + getAttrByName(targetCharacterId, 'hp', 'max'));
                    sendChat(API_NAME, "ac = " + getAttrByName(targetCharacterId, 'npc_ac'));
                    sendChat(API_NAME, "npc speed = " + getAttrByName(targetCharacterId, 'npc_speed'));
                    sendChat(API_NAME, "npc speed bar = " + getAttrByName(targetCharacterId, 'npc_speed').split(' ')[0]);
                }
                
                const copyAttrNames = ["intelligence", "wisdom", "charisma"]
                const copyAttrVariations = ["", "_base", "_mod", "_save_bonus"]
                
                _.each(copyAttrNames, function (attrName) {
                    _.each(copyAttrVariations, function (attrVar) {
                        copyAttribute(defaultShapeObj.id, targetCharacterId, attrName + attrVar, false);
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
                    //controlledby: defaultCharacter.get("controlledby"),
                });
            }
            else
                sendChat(API_NAME, "Cannot shift into a non-pc character");
        }
        else
        {
            const targetCharacter = defaultCharacter;
            const targetCharacterId = defaultShapeObj.id;
            const targetSize = getCreatureSize(defaultShapeObj.size);

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
            //const parts = msg.content.split(/ (.*)/).filter(x => x);
            
            if (message.content.indexOf(API_CMD) == 0)
            {
                const args = msg.content.split(' ').filter(x => x);
                args.shift(); // remove cmd
                if(args.length == 0)
                {
                    if (!msg.selected)
                    {
                        sendChat(API_NAME, "Please select a token then run: " + API_CMD);
                        return;
                    }

                    const obj = findShapeShifter(msg.selected[0]);
                    sendShapeShiftMenu(obj.tokenName, obj.target.shapes);
                    return;
                }
                else
                {          
                    const cmd = args.shift();
                    switch (cmd)
                    {
                        case 'config':
                        {
                            switch (args.shift())
                            {
                                case "add":
                                {
                                    switch (args.shift())
                                    {
                                        case "shifter":
                                        {
                                            const targetName = args.shift();
                                            const targetPrefix = args.shift();
                                            if (targetName)
                                            {
                                                let target = state[API_STATENAME].ShapeShifters[targetName];
                                                if(!target)
                                                {
                                                    target = {
                                                        default: {
                                                          name: targetName,
                                                          shapesPrefix: targetPrefix || '',
                                                        },
                                                          
                                                        shapes: {}
                                                    }
                                                    state[API_STATENAME].ShapeShifters[targetName] = target;
                                                }
                                                else
                                                {
                                                    sendChat(API_NAME, "ERROR: Trying to add ShapeShifter " + targetName + " which already exists");
                                                }
                                            }
                                        }
                                        break;

                                        case "shape":
                                        {
                                            const targetName = args.shift();
                                            const targetShape = args.shift();
                                            let target = state[API_STATENAME].ShapeShifters[targetName];                    
                                            if (target) 
                                            {
                                                target.shapes[targetShape] = {};
                                            }
                                            else
                                            {
                                                sendChat(API_NAME, "ERROR: Trying to add shape to ShapeShifter " + targetName + " which doesn't exist");
                                            }
                                        }
                                        break;
                                    }
                                }                                
                                break;

                                case "remove":
                                {
                                    switch (args.shift())
                                    {
                                        case "shifter":
                                        {
                                            const targetName = args.shift();
                                            if (targetName)
                                            {
                                                if(state[API_STATENAME].ShapeShifters[targetName])
                                                {
                                                    delete state[API_STATENAME].ShapeShifters[targetName];
                                                }
                                                else
                                                {
                                                    sendChat(API_NAME, "ERROR: Trying to delete ShapeShifter " + targetName + " which doesn't exists");
                                                }
                                            }
                                        }
                                        break;

                                        case "shape":
                                        {
                                            const targetName = args.shift();
                                            const targetShape = args.shift();
                                            let target = state[API_STATENAME].ShapeShifters[targetName];                    
                                            if (target) 
                                            {
                                                if (target.shapes[targetShape])
                                                {
                                                    delete target.shapes[targetShape];
                                                }
                                                else
                                                {
                                                    sendChat(API_NAME, "ERROR: Trying to remove shape " + targetShape + " that doesn't exist from ShapeShifter " + targetName);
                                                }
                                            }
                                            else
                                            {
                                                sendChat(API_NAME, "ERROR: Trying to remove shape from ShapeShifter " + targetName + " which doesn't exist");
                                            }
                                        }
                                        break;
                                    }
                                }
                                break;

                                case "change":
                                {
                                }
                                break;
                                
                                default: sendConfigMenu();
                            }
                        }
                        break;

                        case 'help':
                        {
                            sendChat(API_NAME, API_USAGE);
                        }
                        break;

                        default:
                        {
                            // reconstruct target shape name from list of arguments
                            const targetShapeName = cmd + " " + args.join(' ');

                            if (!msg.selected)
                            {
                                sendChat(API_NAME, "Please select a token then run: " + API_USAGE);
                                return;
                            }
                            
                            let targetDruidShape = null;
                            _.each(msg.selected, function(o) 
                            {
                                const obj = findShapeShifter(o);
                                if(obj)
                                {
                                    if (params.toLowerCase() != "default")
                                    {
                                        const targetDruidShape = obj.target.shapes[targetShapeName];
                                        if (targetDruidShape)
                                        {
                                            sendChat(API_NAME, obj.tokenName + " is transforming into: " + targetDruidShape.name);
                                            shapeShift(obj.token, obj.target.default, targetDruidShape);
                                        }
                                        else
                                        {
                                            sendChat(API_NAME, "ERROR: Cannot find shape " + targetShapeName + " for ShapeShifter: " + obj.tokenName);
                                        }
                                    }
                                    else
                                    {
                                        sendChat(API_NAME,  obj.tokenName + " is transforming back into the default shape");
                                        shapeShift(obj.token, obj.target.default);
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
        const defaults = {
            config: {
                command: API_CMD
            },

            ShapeShifters :
            {
              Yunith: {
                default: {
                  name: "Druid Test",
                  shapesPrefix: "Druid-",
                },
                  
                shapes: {
                    GiantToad: {
                        name: "Giant Toad",
                        size: "Large"
                    }
                }
              },
        
              Kamlo: {
                  default: {
                      name: "Copy of Kamlo Cortes",
                      shapesPrefix: "Kamlo-",
                  },
                  
                  shapes: {
                      "Giant Toad": {
                          name: "Giant Toad",
                          size: "Large"
                      },
                      
                      "Adult Black Dragon": {
                          name: "Adult Black Dragon",
                          size: "Huge"
                      }
                  }
              }
            }
        }

        if (!state[API_STATENAME].config || reset) {
            state[API_STATENAME].config = defaults.config;
        }
        else {
            if (!state[API_STATENAME].config.hasOwnProperty('command')) {
                state[API_STATENAME].config.command = defaults.config.command;
            }
        }

        if (!state[API_STATENAME].ShapeShifters || typeof state[API_STATENAME].ShapeShifters !== 'object' || reset)
        {
            state[API_STATENAME].ShapeShifters = defaults.ShapeShifters;
            
            // initialize default IDs
            _.each(state[API_STATENAME].ShapeShifters, function(s) {
                s.default.id = findObjs({ type: 'character', name: s.default.name })[0].get('id');
            });
        }

        if (!state[API_STATENAME].config.hasOwnProperty('firsttime')) {
            sendConfigMenu(true);
            state[API_STATENAME].config.firsttime = false;
        }            
    };

    const checkInstall = () => {
        if(!_.has(state, API_STATENAME)){
            state[API_STATENAME] = state[API_STATENAME] || {};
        }
        setDefaults(true);

        log(API_NAME + ' Ready! Usage: ' + API_USAGE);
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
