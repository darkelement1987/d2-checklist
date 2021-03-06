
import { filter, takeUntil } from 'rxjs/operators';
import { Component, HostBinding, OnDestroy, OnInit, Inject } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';



import { MatSnackBar, MatDialogConfig } from '@angular/material';
import { routerTransition } from './animations/router.transition';
import { environment as env } from '@env/environment';
import { NotificationService } from './service/notification.service';
import { StorageService } from './service/storage.service';
import { BungieService } from './service/bungie.service';
import { SelectedUser, ClanRow, UserInfo, Const, BungieMember } from './service/model';
import { AuthService } from './service/auth.service';
import { DestinyCacheService } from './service/destiny-cache.service';
import { ChildComponent } from './shared/child.component';
import { AuthGuard } from '@app/app-routing.module';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';


@Component({
  selector: 'anms-success-snack',
  templateUrl: 'snackbars/success.html',
  styleUrls: ['snackbars/success.css'],
})
export class SuccessSnackbarComponent {
  message: string;

}

@Component({
  selector: 'anms-info-snack',
  templateUrl: 'snackbars/info.html',
  styleUrls: ['snackbars/info.css'],
})
export class InfoSnackbarComponent {
  message: string;

}

@Component({
  selector: 'anms-warn-snack',
  templateUrl: 'snackbars/warn.html',
  styleUrls: ['snackbars/warn.css'],
})
export class WarnSnackbarComponent {
  message: string;

}

@Component({
  selector: 'anms-select-platform-dialog',
  templateUrl: './select-platform-dialog.component.html',
})
export class SelectPlatformDialogComponent {
  public const: Const = Const;
  newMessage = '';
  constructor(
    public dialogRef: MatDialogRef<SelectPlatformDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserInfo[]) { }


  onSelect(u: UserInfo): void {
    this.dialogRef.close(u);
  }
}


@Component({
  selector: 'anms-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [routerTransition]
})
export class AppComponent implements OnInit, OnDestroy {

  private unsubscribe$: Subject<void> = new Subject<void>();

  @HostBinding('class') componentCssClass;

  disableads: boolean;

  version = env.versions.app;
  debugmode = false;
  year = new Date().getFullYear();

  logo = require('../assets/logo.svg');

  // signed on info
  loggingOn = true;
  signedOnUser: SelectedUser = null;
  public const: Const = Const;

  constructor(
    public authGuard: AuthGuard,
    private notificationService: NotificationService, private storageService: StorageService,
    private authService: AuthService,
    public bungieService: BungieService,
    private destinyCacheService: DestinyCacheService, public overlayContainer: OverlayContainer,
    private router: Router, public snackBar: MatSnackBar,
    public dialog: MatDialog) {


    this.componentCssClass = 'default-theme';
    this.overlayContainer.getContainerElement().classList.add('default-theme');

    this.logon(false);

    this.storageService.settingFeed.pipe(
      takeUntil(this.unsubscribe$))
      .subscribe(
        x => {
          if (x.theme != null) {
            this.componentCssClass = x.theme;
            this.overlayContainer.getContainerElement().classList.add(x.theme);

            // this.overlayContainer.themeClass = x.theme;
          }
          if (x.disableads != null) {
            this.disableads = x.disableads;
          }
        });

    this.notificationService.notifyFeed.pipe(
      takeUntil(this.unsubscribe$))
      .subscribe(
        x => {
          if (x.mode === 'success') {
            const snackRef = this.snackBar.openFromComponent(SuccessSnackbarComponent, {
              duration: 2000
            });
            snackRef.instance.message = x.message;
          } else if (x.mode === 'info') {
            const snackRef = this.snackBar.openFromComponent(InfoSnackbarComponent, {
              duration: 2000
            });
            snackRef.instance.message = x.message;
          } else if (x.mode === 'error') {
            const snackRef = this.snackBar.openFromComponent(WarnSnackbarComponent, {
              duration: 5000
            });
            snackRef.instance.message = x.message;
          }
        });
  }


  public openDialog(): void {
    const dc = new MatDialogConfig();
    dc.disableClose = false;
    dc.autoFocus = true;
     dc.width = '300px';
     dc.data = this.signedOnUser.membership.destinyMemberships;

    const dialogRef = this.dialog.open(SelectPlatformDialogComponent, dc);

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == null) { return; }
      this.selectUser(result);
    });
  }


  loadClan(clanRow: ClanRow) {
    if (this.signedOnUser != null) {
      this.router.navigate(['clan', clanRow.id]);
    }
  }

  async myProfile() {
    if (this.signedOnUser != null) {
      if (this.signedOnUser.userInfo.membershipType === 4) {
        const bnetName = await this.bungieService.getFullBNetName(this.signedOnUser.membership.bungieId);
        if (bnetName!=null)
          this.router.navigate(['/', 4, bnetName]);
      } else {
        this.router.navigate([this.signedOnUser.userInfo.membershipType, this.signedOnUser.userInfo.displayName]);
      }
    }
  }

  ngOnInit(): void {
    this.bungieService.selectedUserFeed.pipe(takeUntil(this.unsubscribe$)).subscribe((selectedUser: SelectedUser) => {
      this.signedOnUser = selectedUser;
      this.loggingOn = false;
      if (selectedUser == null) { return; }
      if (selectedUser.promptForPlatform === true) {
        selectedUser.promptForPlatform = false;
        this.openDialog();
      }
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.unsubscribe$))
      .subscribe(
        (navEnd: NavigationEnd) => {
          try {
            const parts = navEnd.urlAfterRedirects.split('/');
            let logMe = '';
            if (parts.length === 4) {
              logMe = parts[parts.length - 1];
            } else if (parts.length > 1) {
              logMe = parts[1];
            }
            logMe += '-' + (this.disableads ? 'disabledAds' : 'enabledAds');
            (window as any).ga('send', 'pageview', logMe);
          } catch (err) {
            console.dir(err);
          }
        }
      );
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  logon(force: boolean) {
    this.authService.getCurrentMemberId(force);
  }

  selectUser(user) {
    this.bungieService.selectUser(user);
  }

  onLoginClick() {
    this.logon(true);

  }

  onLogoutClick() {
    this.authService.signOut();
  }

}
