We use the standard 5e sheet, but it should be really easy to adapt it to other sheets if you need to do so.

# Install
I put all my utils in a **separate file** which you **need to add** to your API **before the WildShape script**, you can find it here: https://github.com/ocangelo/roll20/blob/master/WildHelpers.js

After that you can copy the main WildShape script: https://github.com/ocangelo/roll20/blob/master/WildShape/WildShape.js

# Main features
* can be used for both PC and NPC to shape shift into either a PC or an NPC
* alt-double clicking on the "shape shifted" token will open the relative pc/npc sheet so that you can run actions from your new shape
* automatically:
    * copy INT/WIS/CHA attributes for druids to NPCs
    * change the token size
    * set hp/ac/speed on bar1/2/3 when you shapeshift
    * setup senses (e.g. light, vision) from darkvision/blindsight info on NPCs, can set defaults and overrides per shape
    * change roll settings on NPC sheet (when transforming from a PC) to never whisper, toggle advantage, don't autoroll damage
    * show journal entries to players for all their shapes
    * change the token to the last taken shape when dropping a new shifter token (e.g. from the journal or copy/paste, useful when moving between maps)
* shapes can be mass imported from a journal folder
* i've tried to make most things configurable so that if you don't like a setting you should be able to easily change it, if not just shoot me a message and i will see what i can do

# Usage
With a token selected both the GM and the player that controls that token can run **!ws** to be presented with a list of all available shapes, just click on an entry to trigger the shapeshift (the GM will have an additional "edit" shown on top as a shortcut).

Here is an example with the before an after clicking on the "Tiger" button, with the sheet that you get by ALT+Double Clicking on the token

![1usage](https://github.com/ocangelo/roll20/blob/master/WildShape/images/1-usage.JPG)
![2usage](https://github.com/ocangelo/roll20/blob/master/WildShape/images/2-usage.JPG)
![3usage](https://github.com/ocangelo/roll20/blob/master/WildShape/images/3-usage.JPG)

# Notes
**IMPORTANT** You should always make copies of the characters for your target shapes, one for each ShapeShifter that will be able to transform into that shape, as attributes and other settings on the characters might be changed when they transform into it.

For instance if you have 2 PCs and 1 NPC being able to transform into a "Giant Toad", you will want to have three separate copies of the "Giant Toad" character, one for each PC and one for the NPC.

**IMPORTANT** There is a limitation on using images directly from the marketplace, whenever you want to use a monster from the Monster Manual (or similar external resource in your compendium) the API might give you an error asking you to reupload the avatar when you try to transform into it, it's really hit or miss so i would suggest you try it first but in case you do get the error to fix it you will need to:

* open up the character sheet (that hopefully you duplicated, let's say "Copy of Black Dragon")
* save the avatar image on your PC (e.g. open the avatar image -> right click -> save as)
* upload that file to the library
* change the avatar on the "Copy of Black Dragon" character sheet to the file you uploaded to the library

# Known Issues
* after shapeshifting you need to reselect your token to refresh the values in the token bars
* cannot copy a shapeshifted token, when pasting it becomes an empty token for some reason... 

# Wishlist
Things i would like to add in future if i have time:
* some sort of categorization to the shape list, maybe player-created so they can split/organize the list shown when they try to shapeshift in any way they want (right now it's alphabetical)
* see if i can copy saves/skills/proficiencies from druids to npcs
* adding some sort of json import/export for shifters and/or shape lists
* add an automatic "duplicate & rename pc/npc" when adding new shapes

# Help

the first time you run it, or if you run **!ws** without anything selected in future, you should see the configuration menu.
Here you can setup which values you want associated to which bars on the token (if any, HP **MUST** to be assigned to one bar), and the attributes on PCs/NPCs used to read/write those values

**NOTE**: Clicking on "**Reset**" will also delete all your shapeshifters.

![4config](https://github.com/ocangelo/roll20/blob/master/WildShape/images/4-config.JPG)

One available feature is to automatically write senses (vision, light, etc.) to the token for you, this feature is enabled by default.

The API will automatically grab the "darkvision" and "blindsight" values from the NPC Data "SENSES" attribute and set them as dim/bright light radius; you can also force different senses data per shape/shifter if you need to do so (useful to define the base darkvision settings for your elf druid when he/she transforms to the default shape for instance).

In the main menu you can enable/disable the feature and set the defaults in case the data cannot be retried and the values are not overridden at the shape/shifter level.

![9-writeSenses](https://github.com/ocangelo/roll20/blob/master/WildShape/images/9-writeSenses.JPG)

the Edit Shifter brings you to this menu where you can add shifters simply by clicking on their tokens (targeting), it will recognize if you are adding a PC or an NPC:

![5config](https://github.com/ocangelo/roll20/blob/master/WildShape/images/5-config.JPG)

Editing a shifter you can assign a different token name to it, change which character (base shape) it's linked to, and then you have a list of available shapes that you can add from drop downs (that will show either all PCs or all NPCs), or you can do a **mass import from a folder (more on this later)**

**IMPORTANT**: right now i am using the token names to find shifters when they try to shapeshift, if you change it in your game you will have to edit it in the shifter settings

![6-editShifter](https://github.com/ocangelo/roll20/blob/master/WildShape/images/6-editShifter.JPG)

each shape has an optional "simple name" and a character associated to it, the simple name will be the one displayed on the list of available shapes when shapeshifting, if they match changing the character will automatically change the name as well.

here you can also override the size of the target shape if you want to (it will show you a drop down with normal/large/huge/gargantuan options)

![7-editShape](https://github.com/ocangelo/roll20/blob/master/WildShape/images/7-editShape.JPG)

## Import Shapes from Folder:

Something that i wanted to avoid was to add shapes one by one for my druid, so i created a way to import ALL shapes from a given folder.

You can do that by clicking on the "Import Shapes from Folder" in the "edit shifter" menu, my workflow was to duplicate a bunch of monsters and organize them in different folders

you will be prompted with:

* a folder name (e.g. "lbpyp/wild shape/flying", is not case sensitive and you can use either \ or / to separate your path)
* if you want to include characters found in subfolders (e.g. yes)
* if you want to remove a prefix (e.g. "Copy of " that is automatically added when you duplicate a character)
* if you want to add a new prefix (e.g. "Zana - ", i like to add the character name so i can easily find their shapes)
* if you want to add the prefix to the "simple name" (e.g. "no", this way the list shown to the player and in the config will just have the shape name, like "eagle" while pointing to the character "zana - eagle")


So in the screenshot below i had initially all the monsters duplicated with the "copy of " in front of them, i clicked on the import button and all shapes were renamed, added to my shapeshifter list, and also added to my player journal.

In future i can just run the same thing on the "flying" or "swimming" folder i already have prepared and they will get access to all those shapes

![8-importFolder](https://github.com/ocangelo/roll20/blob/master/WildShape/images/8-importFolder.JPG)
