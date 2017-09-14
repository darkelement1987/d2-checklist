
import { Injectable } from '@angular/core';
import { DestinyCacheService } from './destiny-cache.service';
import {
    Character, CurrentActivity, Progression, Activity,
    Profile, Player, MilestoneStatus, MileStoneName, PGCR, PGCREntry, UserInfo, LevelProgression,
    Const, BungieMembership, BungieMember, BungieMemberPlatform, BungieGroupMember, ClanInfo
} from './model';
@Injectable()
export class ParseService {

    constructor(private destinyCacheService: DestinyCacheService) { }

    private parseCharacter(c: _Character): Character {
        let char: Character = new Character();

        char.membershipId = c.membershipId;
        char.membershipType = c.membershipType;

        char.characterId = c.characterId;
        char.dateLastPlayed = c.dateLastPlayed;
        char.minutesPlayedThisSession = c.minutesPlayedThisSession;
        char.minutesPlayedTotal = c.minutesPlayedTotal;
        char.light = c.light;
        char.emblemBackgroundPath = c.emblemBackgroundPath;
        char.emblemPath = c.emblemPath;
        char.baseCharacterLevel = c.baseCharacterLevel;
        char.percentToNextLevel = c.percentToNextLevel / 100;

        char.gender = this.destinyCacheService.cache.Gender[c.genderHash].displayProperties.name;
        char.race = this.destinyCacheService.cache.Race[c.raceHash].displayProperties.name;
        char.className = this.destinyCacheService.cache.Class[c.classHash].displayProperties.name;
        return char;
    }

    private populateActivities(c: Character, _act: any): void {
        let hash: number = _act.currentActivityHash;

        if (hash != 0) {
            let act: CurrentActivity = new CurrentActivity();
            act.dateActivityStarted = _act.dateActivityStarted;

            let desc: any = this.destinyCacheService.cache.Activity[hash];
            if (desc) {
                act.name = desc.displayProperties.name;
                if (desc.activityTypeHash) {
                    let typeDesc: any = this.destinyCacheService.cache.ActivityType[desc.activityTypeHash];
                    if (typeDesc != null) {
                        act.type = typeDesc.displayProperties.name;
                    }
                }
                act.activityLevel = desc.activityLevel;
                act.activityLightLevel = desc.activityLightLevel;
            }

            //ignore in orbit
            if (act.name != null && act.name.trim().length > 0) {
                c.currentActivity = act;
            }
        }
    }
    // factionHash
    private parseProgression(p: _Progression, desc: any): Progression {
        if (desc != null) {

            let prog: Progression = new Progression();
            prog.icon = desc.displayProperties.icon;
            prog.hash = p.progressionHash;
            let name = desc.displayProperties.name;
            let info = "";
            if (name == "Exodus Black AI") {
                name = "Failsafe";
                info = "Nessus";
            }
            else if (name == "Dead Zone Scout") { name = "Devrim"; info = "EDZ"; }
            else if (name == "Vanguard Tactical") { name = "Zavala"; info = "Strikes"; }
            else if (name == "Vanguard Research") { name = "Ikora"; info = "Research"; }
            else if (name == "Fragmented Researcher") { name = "Asher"; info = "IO"; }
            else if (name == "Field Commander") { name = "Sloane"; info = "Titan"; }
            else if (name == "The Crucible") { name = "Crucible"; info = "Shaxx"; }
            else if (name == "Gunsmith") { name = "Gunsmith"; info = "Banshee / Crucible"; }
            else if (name == "Classified") { return null; }

            prog.name = name;
            prog.info = info;



            prog.desc = desc.displayProperties.description;
            prog.currentProgress = p.currentProgress;
            prog.dailyLimit = p.dailyLimit;
            prog.dailyProgress = p.dailyProgress;
            prog.weeklyLimit = p.weeklyLimit;
            prog.weeklyProgress = p.weeklyProgress;
            prog.levelCap = p.levelCap;
            prog.level = p.level;
            prog.percentToNextLevel = p.progressToNextLevel / p.nextLevelAt;
            return prog;
        }
        else {
            return null;
        }
    }


    private static parseMilestoneType(t: number): string {
        //tutorial and one-time
        if (t == 1 || t == 2) return null;
        if (t == 3) return "Weekly";
        if (t == 4) return "Daily";
        if (t == 5) return "Special";
        return "Unknown";
    }

    private populateProgressions(c: Character, _prog: any, mileStoneDefs: any): void {
        c.milestones = {};
        if (_prog.milestones != null) {
            Object.keys(_prog.milestones).forEach((key) => {
                //clan rewards special case
                if (key == "4253138191") {
                    console.log("TODO handle clan rewards");
                    return;
                }
                let ms: _Milestone = _prog.milestones[key];
                //add meta
                if (mileStoneDefs[key] == null) {
                    let desc = this.destinyCacheService.cache.Milestone[ms.milestoneHash];
                    if (desc != null) {
                        let name: string = "";
                        let description: string = "";
                        if (desc.displayProperties != null) {
                            name = desc.displayProperties.name;
                            description = desc.displayProperties.description;
                        }
                        if (name == null || name.trim().length == 0) {
                            name = desc.friendlyName;
                        }

                        let type: string = ParseService.parseMilestoneType(desc.milestoneType);
                        //null is tutorial or one-time, skip
                        if (type == null) return;
                        //skip classified for now
                        if (name == null || name == "Classified") return;
                        let milestoneName: MileStoneName = {
                            key: key,
                            type: type,
                            name: name,
                            desc: description
                        };
                        mileStoneDefs[key] = milestoneName;
                    }
                    else {
                        console.log("Unknown milestone: " + key);
                        return;
                    }
                }

                let total = 0;
                let complete = 0;
                let info: string = "";

                if (ms.availableQuests != null) {
                    ms.availableQuests.forEach((q: _AvailableQuest) => {
                        total++;
                        if (q.status.completed) complete++;
                    })
                }
                if (total == 0) total++;
                let pct: number = complete / total;

                let m: MilestoneStatus = new MilestoneStatus(key, complete == total, pct, "");
                c.milestones[key] = m;


            });
        }

        let factions: Progression[] = [];
        if (_prog.factions != null) {
            Object.keys(_prog.factions).forEach((key) => {
                let p: _Progression = _prog.factions[key];
                let prog: Progression = this.parseProgression(p, this.destinyCacheService.cache.Faction[p.factionHash]);
                if (prog != null) {
                    factions.push(prog);
                }

            });

        }
        factions.sort(function (a, b) {
            return b.percentToNextLevel - a.percentToNextLevel;
        })
        c.factions = factions;

        //progressions
        //quests?
        //uninstancedItemObjectives
        //c.progression = saveMe;

    }



    private static getBasicValue(val: any): number {
        if (val == null) return null;
        if (val.basic == null) return;
        return val.basic.value;
    }

    private parseActivity(a): any {
        let act: Activity = new Activity();

        act.period = a.period;
        act.referenceId = a.activityDetails.referenceId;
        act.instanceId = a.activityDetails.instanceId;
        act.mode = ParseService.lookupMode(a.activityDetails.mode);
        act.type = "";
        let desc: any = this.destinyCacheService.cache.Activity[act.referenceId];
        if (desc) {
            act.name = desc.displayProperties.name;
            if (desc.activityTypeHash) {
                let typeDesc: any = this.destinyCacheService.cache.ActivityType[desc.activityTypeHash];
                if (typeDesc != null) {
                    act.type = typeDesc.displayProperties.name;
                }
            }
            //TODO activityModeHash let modeDesc: any = this.destinyCacheService.cache.ActivityMode[desc.activityModeHash];
            if (a.activityDetails.activityTypeHashOverride) {
                console.log("Override: " + a.activityDetails.activityTypeHashOverride);
                // let typeDesc: any = this.destinyCacheService.cache.ActivityType[a.activityDetails.activityTypeHashOverride];
                // if (typeDesc != null) {
                //     console.log("Override: " + typeDesc.displayProperties.name);
                //     act.type = typeDesc.displayProperties.name;
                // }
            }
            act.activityLevel = desc.activityLevel;
            act.activityLightLevel = desc.activityLightLevel;
        }
        if (a.values) {
            act.completed = ParseService.getBasicValue(a.values.completed);
            act.timePlayedSeconds = ParseService.getBasicValue(a.values.timePlayedSeconds);
            act.playerCount = ParseService.getBasicValue(a.values.playerCount);
            act.standing = ParseService.getBasicValue(a.values.standing);
            act.kills = ParseService.getBasicValue(a.values.kills);
            act.deaths = ParseService.getBasicValue(a.values.deaths);
            act.assists = ParseService.getBasicValue(a.values.assists);
            act.score = ParseService.getBasicValue(a.values.score);


        }
        act.isPrivate = a.activityDetails.isPrivate;
        if (desc.isPvP) {
            act.pvType = "PvP";
        }
        else {
            act.pvType = "PvE";
        }

        act.desc = act.mode + ": " + act.name;
        if (act.isPrivate) {
            act.desc += "(Private)";
        }
        //act.values = a.values;
        return act;

    }

    public parseActivities(a: any[]): any[] {
        let returnMe: any[] = [];
        a.forEach((act) => {
            let parsed = this.parseActivity(act);
            if (parsed != null)
                returnMe.push(parsed);
        })
        return returnMe;
    }

    public parsePlayer(resp: any): Player {
        if (resp.profile.privacy == 2) throw new Error("Privacy settings disable viewing this player's profile.");
        if (resp.characters.privacy == 2) throw new Error("Privacy settings disable viewing this player's characters.");
        const profile: Profile = resp.profile.data;

        let charsDict: any = {};


        const oChars: any = resp.characters.data;
        Object.keys(oChars).forEach((key) => {
            charsDict[key] = this.parseCharacter(oChars[key]);
        });

        let mileStoneDefs: any = {};

        if (resp.characterProgressions && resp.characterProgressions.data) {
            const oProgs: any = resp.characterProgressions.data;
            Object.keys(oProgs).forEach((key) => {
                let curChar: Character = charsDict[key];
                this.populateProgressions(curChar, oProgs[key], mileStoneDefs);
            });
        }

        //convert dictionary to array for UI
        let milestoneList: MileStoneName[] = [];
        Object.keys(mileStoneDefs).forEach(key => {
            milestoneList.push(mileStoneDefs[key]);
        });

        let currentActivity: CurrentActivity = null;

        if (resp.characterActivities && resp.characterActivities.data) {
            const oActs: any = resp.characterActivities.data;
            Object.keys(oActs).forEach((key) => {
                let curChar: Character = charsDict[key];
                this.populateActivities(curChar, oActs[key]);
                if (curChar.currentActivity != null) {
                    currentActivity = curChar.currentActivity;
                }
            });
        }

        let chars: Character[] = [];
        Object.keys(charsDict).forEach((key) => {
            chars.push(charsDict[key]);
        });



        return new Player(profile, chars, currentActivity, milestoneList);
    }

    public parseClanInfo(j: any): ClanInfo {

        let c: ClanInfo = new ClanInfo();
        c.groupId = j.groupId;
        c.name = j.name;
        c.creationDate = j.creationDate;
        c.memberCount = j.memberCount;
        c.avatarPath = j.avatarPath;
        c.bannerPath = j.bannerPath;
        let progs: Progression[] = [];
        if (j.clanInfo != null && j.clanInfo.d2ClanProgressions != null) {
            Object.keys(j.clanInfo.d2ClanProgressions).forEach((key) => {
                let p: _Progression = j.clanInfo.d2ClanProgressions[key];
                let prog: Progression = this.parseProgression(p, this.destinyCacheService.cache.Progression[p.progressionHash]);
                if (prog != null) {
                    progs.push(prog);
                }

            });

        }
        c.progressions = progs;
        return c;
    }

    public parseClanMembers(members: any[]): BungieGroupMember[] {
        if (members == null) return [];
        let returnMe: BungieGroupMember[] = [];
        members.forEach(x => {
            let b: BungieGroupMember = new BungieGroupMember();
            b.groupId = x.groupId;
            b.isOnline = x.isOnline;
            b.memberType = x.memberType;
            b.destinyUserInfo = this.parseUserInfo(x.destinyUserInfo);
            b.bungieNetUserInfo = x.bungieNetUserInfo;
            returnMe.push(b);
        });
        return returnMe;
    }

    private parsePGCREntry(e: any): PGCREntry {
        let r: PGCREntry = new PGCREntry();
        r.characterId = e.characterId;
        r.standing = e.standing;
        r.score = ParseService.getBasicValue(e.score);
        if (e.values) {

            r.kills = ParseService.getBasicValue(e.values.kills);
            r.deaths = ParseService.getBasicValue(e.values.deaths);
            r.assists = ParseService.getBasicValue(e.values.assists);
            r.fireteamId = ParseService.getBasicValue(e.values.fireteamId);
        }
        r.characterClass = e.player.characterClass;
        r.characterLevel = e.player.characterLevel;
        r.lightLevel = e.player.lightLevel;
        if (!r.fireteamId) r.fireteamId = -1;
        if (!r.score) r.score = 0;

        r.user = this.parseUserInfo(e.player.destinyUserInfo);
        return r;
    }

    public parseUserInfo(i: any): UserInfo {
        let platformName: string = "";
        if (i.membershipType == 1) {
            platformName = "XBL";
        }
        else if (i.membershipType == 2) {
            platformName = "PSN";
        }
        else if (i.membershipType == 4) {
            platformName = "BNET";
        }
        return {
            'membershipType': i.membershipType,
            'membershipId': i.membershipId,
            'displayName': i.displayName,
            'icon': i.iconPath,
            'platformName': platformName
        };

    }

    public parsePGCR(p: any): PGCR {
        let r: PGCR = new PGCR();
        r.period = p.period;
        r.referenceId = p.activityDetails.referenceId;
        r.instanceId = p.activityDetails.instanceId;
        r.mode = ParseService.lookupMode(p.activityDetails.mode);

        let desc: any = this.destinyCacheService.cache.Activity[r.referenceId];
        if (desc) {
            r.name = desc.displayProperties.name;
            r.level = desc.activityLevel;
        }
        else {
            r.name = "redacted";
        }

        r.isPrivate = p.activityDetails.isPrivate;
        r.entries = [];
        p.entries.forEach((ent) => {
            r.entries.push(this.parsePGCREntry(ent));
        });

        let teamList = {};

        r.entries.forEach((ent) => {
            let list = teamList[ent.fireteamId];
            if (list == null) {
                teamList[ent.fireteamId] = [];
                list = teamList[ent.fireteamId];
            }
            list.push(ent);
        });

        let cntr: number = 0;
        Object.keys(teamList).forEach((key) => {
            cntr++;

            let list = teamList[key];
            list.forEach((ent) => {
                ent.fireteam = cntr;
            });
        });
        r.entries.sort(function (a, b) {
            return b.score - a.score;
        })

        return r;

    }

    public static lookupMode(mode: number): string {
        if (mode == 0) return "All";
        if (mode == 2) return "Story";
        if (mode == 3) return "Strike";
        if (mode == 4) return "Strike";
        if (mode == 5) return "All PvP";
        if (mode == 6) return "Patrol";
        if (mode == 7) return "All PvE";
        if (mode == 10) return "Control";
        if (mode == 12) return "Clash";
        if (mode == 16) return "Nightfall";
        if (mode == 17) return "Heroic Nightfall";
        if (mode == 18) return "All Strikes";
        if (mode == 37) return "Survival";
        if (mode == 38) return "Countdown";
        if (mode == 38) return "Countdown";
        if (mode == 40) return "Social";
        return "unknown";
    }

    public parseBungieMembership(resp: any) {

        let returnMe: BungieMembership = new BungieMembership();
        returnMe.bungieId = resp.bungieNetUser.membershipId;
        let aUser: UserInfo[] = [];
        resp.destinyMemberships.forEach(u => {
            aUser.push(this.parseUserInfo(u));
        });
        returnMe.destinyMemberships = aUser;
        return returnMe;

    }


    public parseBungieMembers(results: _BungieMember[]): BungieMember[] {
        if (results == null) return null;
        let returnMe: BungieMember[] = [];
        results.forEach(r => {
            if (r.isDeleted == true) return;
            let xbl: BungieMemberPlatform;
            let psn: BungieMemberPlatform;
            let bnet: BungieMemberPlatform;
            if (r.xboxDisplayName != null) {
                xbl = new BungieMemberPlatform(r.xboxDisplayName, Const.XBL_PLATFORM);
            }
            if (r.psnDisplayName != null) {
                psn = new BungieMemberPlatform(r.psnDisplayName, Const.PSN_PLATFORM);
            }
            if (r.blizzardDisplayName != null) {

                bnet = new BungieMemberPlatform(r.blizzardDisplayName, Const.BNET_PLATFORM);
            }
            if (xbl == null && psn == null && bnet == null) return;

            returnMe.push(new BungieMember(r.displayName, r.membershipId, xbl, psn, bnet));

        });
        return returnMe;
    }
}

interface _Character {
    membershipId: string;
    membershipType: number;
    characterId: string;
    dateLastPlayed: string;
    minutesPlayedThisSession: string;
    minutesPlayedTotal: string;
    light: number;

    stats: any;
    raceHash: number;
    genderHash: number;
    classHash: number;
    raceType: number;
    classType: number;
    genderType: number;
    emblemPath: string;
    emblemBackgroundPath: string;
    emblemHash: number;
    levelProgression: LevelProgression;
    baseCharacterLevel: number;
    percentToNextLevel: number;
}

interface _Milestone {
    milestoneHash: number;
    availableQuests: _AvailableQuest[];
    startDate: string;
    endDate: string;
}

interface _AvailableQuest {
    questItemHash: number;
    status: _QuestStatus;
}


interface _QuestStatus {
    questHash: number;
    stepHash: number;
    stepObjectives: any[];
    tracked: boolean;
    itemInstanceId: string;
    completed: boolean;
    redeemed: boolean;
    started: boolean;
}

interface _Progression {
    factionHash: number;
    progressionHash: number;
    dailyProgress: number;
    dailyLimit: number;
    weeklyProgress: number;
    weeklyLimit: number;
    currentProgress: number;
    level: number;
    levelCap: number;
    stepIndex: number;
    progressToNextLevel: number;
    nextLevelAt: number;
}


interface _BungieMember {
    membershipId: string;
    uniqueName: string;
    displayName: string;
    profilePicture: number;
    profileTheme: number;
    userTitle: number;
    successMessageFlags: string;
    isDeleted: boolean;
    about: string;
    firstAccess: string;
    lastUpdate: string;
    psnDisplayName: string;
    xboxDisplayName: string;
    showActivity: boolean;
    locale: string;
    localeInheritDefault: boolean;
    showGroupMessaging: boolean;
    profilePicturePath: string;
    profileThemeName: string;
    userTitleDisplay: string;
    statusText: string;
    statusDate: string;
    blizzardDisplayName: string;
}