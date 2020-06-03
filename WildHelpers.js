class WildUtils {
    constructor(apiName) {
        this.APINAME = apiName || "API";
    }

    chat(msg) {
        sendChat(this.APINAME, "/w gm " + msg, null, {noarchive:true});
    }
    
    chatAs(characterId, msg) {
        sendChat("character|" + characterId, msg, null, {noarchive:true});
    }

    chatToPlayer(who, msg) {
       sendChat(this.APINAME, "/w " + playerid + " " + msg, null, {noarchive:true});
    }

    chatError(msg) {
       sendChat(this.APINAME, "/w gm ERROR: " + msg, null, {noarchive:true});
    }

    chatErrorToPlayer(who, msg) {
       sendChat(this.APINAME, "/w " + who + " ERROR: " + msg, null, {noarchive:true});
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

    getCharactersWithAttr(attributeName) {
        /* start the chain with all the attribute objects named 'attributeName' */
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
       sendChat("findNestedFolder", name);

        var folderStack = [];
        folderStack.push(folderData);
        var targetFolder;

        _.each(folderStack.pop(), function(obj) {
            if(!targetFolder && _.isObject(obj))
            {
                sendChat("findNestedFolder", "checking: " + obj.n);

                if (obj.n.toLowerCase() === name.toLowerCase()) {
                   sendChat("findNestedFolder", "found");

                   targetFolder = obj;
                }
                else
                {
                   sendChat("findNestedFolder", "add to stack " + obj.i);
                    folderStack.push(obj.i);
                }
            }
        });

        return targetFolder;
    }

    getCharactersInFolder(folder) {
        var folderData = JSON.parse(Campaign().get('journalfolder'));
        var charactersInFolder = _.chain(this.findNestedFolder(folderData, folder).i)
            .filter(function(obj) { return _.isString(obj); })
            .map(function(id) { return getObj('character', id); })
            .reject(function(char) { return !char; })
            .value();

        sendChat("test", JSON.stringify(charactersInFolder));

        // rename
        //_.each(charactersInFolder, function(char){
        //    const charObj = findObjs({ type: 'character', id: char.id })[0];
        //    if (charObj)
        //        charObj.set("name", "test-"+charObj.get("name"));
        //});
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

    /* UNTESTED
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
    */
}

class WildMenu {
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

    makeListButton(buttonName, href, addStyle, alt) {
        return this.makeButton(buttonName, href,  "float: right; " + addStyle, alt);
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