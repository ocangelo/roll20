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
var WildShape = WildShape || (function() {
    'use strict';

    const API_NAME = "WildShape";
    const API_VERSION = "0.1";
    const API_USAGE = "!ws shapeName";
    const API_STATENAME = "WILDSHAPE";
    const API_DEBUG = false;

    const ShapeShifters = {
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
    
    // initialize default IDs
    _.each(ShapeShifters, function(s) {
        s.default.id = findObjs({ type: 'character', name: s.default.name })[0].get('id');
    });

    function getCleanImgsrc(imgsrc) {
        let parts = imgsrc.match(/(.*\/images\/.*)(thumb|med|original|max)([^\?]*)(\?[^?]+)?$/);
        if(parts) {
            return parts[1]+'thumb'+parts[3]+(parts[4]?parts[4]:`?${Math.round(Math.random()*9999999)}`);
        }
        return;
    };

    function findShapeShifter(selectedToken) {
        let tokenObj = getObj(selectedToken._type, selectedToken._id);
        const name = tokenObj.get("name");
        const obj = ShapeShifters[name];
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
    
    on("chat:message", function (msg) {
        if (msg.type === "api" && msg.selected)
        {
            const parts = msg.content.split(/ (.*)/).filter(x => x);
            
            if (parts[0].toLowerCase() === "!ws")  {
                 if (!msg.selected || msg.selected.length < 1)
                {
                    sendChat(API_NAME, "Please select a ShapeShifter Token and specify a target shape, usage: " + API_USAGE);
                    return;
                }

                let targetDruidShape = null;
                _.each(msg.selected, function(o) {
                    const obj = findShapeShifter(o);
                    if(obj)
                    {
                        if (parts.length === 2 && parts[1].toLowerCase() != "default")
                        {
                            const targetDruidShape = obj.target.shapes[parts[1]];
                            if (targetDruidShape)
                            {
                                sendChat(API_NAME, obj.tokenName + " is transforming into: " + targetDruidShape.name);
                                shapeShift(obj.token, obj.target.default, targetDruidShape);
                            }
                            else
                            {
                                sendChat(API_NAME, "ERROR: Cannot find shape " + parts[1] + " for ShapeShifter: " + obj.tokenName);
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
    });


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
    }

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
    },

    sendConfigMenu = (first) => {
        let commandButton = makeButton('!'+state[state_name].config.command, '!' + state[state_name].config.command + ' config command|?{Command (without !)}', buttonStyle);
        let userAllowedButton = makeButton(state[state_name].config.userAllowed, '!' + state[state_name].config.command + ' config userAllowed|'+!state[state_name].config.userAllowed, buttonStyle);
        let userToggleButton = makeButton(state[state_name].config.userToggle, '!' + state[state_name].config.command + ' config userToggle|'+!state[state_name].config.userToggle, buttonStyle);
        let toGMButton = makeButton(state[state_name].config.sendOnlyToGM, '!' + state[state_name].config.command + ' config sendOnlyToGM|'+!state[state_name].config.sendOnlyToGM, buttonStyle);
        let statusChangeButton = makeButton(state[state_name].config.showDescOnStatusChange, '!' + state[state_name].config.command + ' config showDescOnStatusChange|'+!state[state_name].config.showDescOnStatusChange, buttonStyle);
        let showIconButton = makeButton(state[state_name].config.showIconInDescription, '!' + state[state_name].config.command + ' config showIconInDescription|'+!state[state_name].config.showIconInDescription, buttonStyle);

        let listItems = [
            '<span style="float: left">Command:</span> ' + commandButton,
            '<span style="float: left">Player Show:</span> '+userAllowedButton,
            '<span style="float: left">Player Toggle:</span> '+userToggleButton,
            '<span style="float: left">Show on Status Change:</span> '+statusChangeButton,
            '<span style="float: left">Display icon in chat:</span> '+showIconButton
        ];

        let configConditionsButton = makeButton('Conditions Config', '!' + state[state_name].config.command + ' config-conditions', buttonStyle + ' width: 100%');
        let resetButton = makeButton('Reset Config', '!' + state[state_name].config.command + ' reset', buttonStyle + ' width: 100%');

        let exportButton = makeButton('Export Config', '!' + state[state_name].config.command + ' config export', buttonStyle + ' width: 100%');
        let importButton = makeButton('Import Config', '!' + state[state_name].config.command + ' config import ?{Config}', buttonStyle + ' width: 100%');

        let title_text = (first) ? script_name+' First Time Setup' : script_name+' Config';
        let contents = makeList(listItems, listStyle + ' overflow:hidden;', 'overflow: hidden')+'<hr>'+configConditionsButton+'<hr><p style="font-size: 80%">You can always come back to this config by typing `!'+state[state_name].config.command+' config`.</p><hr>'+exportButton+importButton+resetButton;
        makeAndSendMenu(contents, title_text)
    },

    setDefaults = (reset) => {
        const defaults = {
            config: {
                command: API_USAGE
            },

            ShapeShifters :
            {

            }
        }

        if (!state[API_STATENAME].config) {
            state[API_STATENAME].config = defaults.config;
        }
        else {
            if (!state[API_STATENAME].config.hasOwnProperty('command')) {
                state[API_STATENAME].config.command = defaults.config.command;
            }
        }

        if (!state[API_STATENAME].ShapeShifters || typeof state[API_STATENAME].ShapeShifters !== 'object')
        {
            state[API_STATENAME].ShapeShifters = defaults.ShapeShifters;
        }

        if (!state[API_STATENAME].config.hasOwnProperty('firsttime') && !reset) {
            sendConfigMenu(true);
            state[API_STATENAME].config.firsttime = false;
        }
    };

    checkInstall = () => {
        if(!_.has(state, API_STATENAME)){
            state[API_STATENAME] = state[API_STATENAME] || {};
        }
        setDefaults();

        log(API_NAME + ' Ready! Command: ' + API_USAGE);
    };
    
    return {
        checkInstall,
        ObserveTokenChange: observeTokenChange,
        registerEventHandlers,
        getConditions,
        getConditionByName,
        handleConditions,
        sendConditionToChat,
        getIcon,
        version
    };
})();

on('ready', () => { 
    'use strict';

    WildShape.checkInstall();
    WildShape.registerEventHandlers();
});
