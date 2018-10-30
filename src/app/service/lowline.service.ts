import { Injectable, OnDestroy, OnInit } from '@angular/core';
import { merge, fromEvent as observableFromEvent, Subject, Observable, of as observableOf, forkJoin } from 'rxjs';
import { catchError, map, startWith, switchMap, flatMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class LowLineService implements OnDestroy {

    private unsubscribe$: Subject<void> = new Subject<void>();
    private data: LowLineResponse = null;

    constructor(private httpClient: HttpClient) {
    }

    public async init(): Promise<void>{
        if (this.data!=null) return;
        else{
            const temp = await this.load();
            if (temp.success==true){
                this.data = temp;
            }
            return null;
        }
    } 

    //https://lowlidev.com.au/destiny/maps/titan/item/2277930478
    public buildItemLink(itmHash: string): string{
        
        if (this.data==null) return null;
        const lData = this.data.data.items[itmHash];
        if (lData==null) return null;
        for (const index of lData){
            const p: LowLineParentNode = this.data.data.nodes[index];
            const l = "https://lowlidev.com.au/destiny/maps/"+p.destinationId+"/item/"+itmHash;
            return l;
        }
        return null;
    }

    //https://lowlidev.com.au/destiny/maps/{destination}/record/{recordHash}
    public buildRecordLink(hash: string): string{
        
        if (this.data==null) return null;
        const lData = this.data.data.records[hash];
        if (lData==null) return null;
        for (const index of lData){
            const p: LowLineParentNode = this.data.data.nodes[index];
            const l = "https://lowlidev.com.au/destiny/maps/"+p.destinationId+"/record/"+hash;
            return l;
        }
        return null;
    }

    
    private async load(): Promise<LowLineResponse> {
        const requestUrl = 'https://lowlidev.com.au/destiny/api/v2/map/supported';
        return this.httpClient.get<LowLineResponse>(requestUrl).toPromise();
    }


    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }


}

export interface LowLineResponse {
    success: boolean;
    data: LowLineData;
  }
  
  interface LowLineData {
    items: any; //dictionary of number arrays
    records: any; //dictionary of number arrays
    nodes: LowLineParentNode[]
  }

  interface LowLineParentNode {
    destinationId: string;
    destinationHash: number;
    bubbleId: string;
    bubbleHash: number;
    node: LowLineNode;
  }
  
  interface LowLineNode {
    x: number;
    y: number;
    type: string;
    nodeHash: string;
    itemHash: string;
    bannerImage: string;
    locationHash: string;
    title: string;
    link: string;
    videoLink: string;
    checklistIndex: string;
    powerLevel: string;
    icon: string;
    recordHash: string;
    objectiveHash: string;
  }