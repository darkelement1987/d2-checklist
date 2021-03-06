
import {takeUntil} from 'rxjs/operators';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ANIMATE_ON_ROUTE_ENTER } from '../../animations/router.transition';
import { BungieService } from '../../service/bungie.service';
import { BungieMember, BungieMemberPlatform, SearchResult, Player, ClanRow } from '../../service/model';
import { ChildComponent } from '../../shared/child.component';
import { StorageService } from '../../service/storage.service';

@Component({
  selector: 'anms-bungie-search',
  templateUrl: './bungie-search.component.html',
  styleUrls: ['./bungie-search.component.scss']
})
export class BungieSearchComponent extends ChildComponent implements OnInit, OnDestroy {
  animateOnRouteEnter = ANIMATE_ON_ROUTE_ENTER;
  name: string;
  accounts: BungieMember[] = null;

  constructor(storageService: StorageService, private bungieService: BungieService,
    private route: ActivatedRoute, private router: Router) {
    super(storageService);
  }

  private loadPlayer(a: BungieMemberPlatform) {
    this.loading = true;
    this.bungieService.searchPlayer(a.platform.type, a.name).then((p: SearchResult) => {
      if (p != null) {

        this.bungieService.getChars(p.membershipType, p.membershipId, ['Profiles', 'Characters']).then((x: Player) => {
          this.loading = false;
          if (x != null) {
            this.router.navigate([a.platform.type, a.name]);
          } else {
            a.defunct = true;
          }
        });

      } else {
        a.defunct = true;
        this.loading = false;
      }
    });
  }

  private loadClan(member: BungieMember) {
    this.bungieService.getClans(member.id).then((x: ClanRow[]) => {
      if (x.length === 0) {
        member.noClan = true;
      } else {
        member.clans = x;
      }
    });
  }

  search() {
    if (this.name != null) {
      this.router.navigate(['search', this.name]);
    }

  }

  private load() {
    this.loading = true;
    this.bungieService.searchBungieUsers(this.name)
      .then((x: BungieMember[]) => {
        this.accounts = x;
        this.loading = false;
      })
      .catch((x) => {
        this.loading = false;
      });
  }

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      this.name = params['name'];
      if (this.name != null) {
        this.load();
      }
    });
  }
}
