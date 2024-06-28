import { LightningElement, track, wire } from 'lwc';
import getFinancialServicesAccounts from '@salesforce/apex/FinancialServicesAccountsController.getFinancialServicesAccounts';
import updateAccounts from '@salesforce/apex/FinancialServicesAccountsController.updateAccounts';
import canUserEditAccount from '@salesforce/apex/FinancialServicesAccountsController.canUserEditAccount';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';

const columns = [
    {
        label: 'Account Name',
        fieldName: 'accountUrl',
        type: 'url',
        sortable: true,
        editable: 'CanEdit',
        typeAttributes: {
            label: { fieldName: 'Name' },
            target: '_blank',
             tooltip: { fieldName: 'Name' }
        }
        
    },
    { label: 'Account Owner', fieldName: 'OwnerName', type: 'text', sortable: true },
    { label: 'Phone', fieldName: 'Phone', type: 'phone', editable: 'CanEdit' },
    { label: 'Website', fieldName: 'Website', type: 'url', editable: 'CanEdit' },
    { label: 'Annual Revenue', fieldName: 'AnnualRevenue', type: 'currency', editable: 'CanEdit'}
];

export default class FinancialServicesAccounts extends NavigationMixin(LightningElement) {
    @track data;
    @track columns = columns;
    @track sortBy;
    @track sortDirection;
    @track searchKey = '';
    @track error;
    @track draftValues = [];
    @track showTable = true;
    @track showMsg =false;
    @track editMap=new Map();
    
    wiredAccountsResult;

    @wire(getFinancialServicesAccounts)
    wiredAccounts(result) {
        this.wiredAccountsResult = result;
        if (result.data) {
            result.data.forEach(eachAcc=>{
                canUserEditAccount({accountId:eachAcc.Id})
                .then(boolresult=>{
                    console.log('id is::'+eachAcc.Id);
                    console.log('boolresult::'+JSON.stringify(boolresult));
                    this.editMap[eachAcc.Id]=boolresult;
                    
                    console.log('mapINloop is::'+JSON.stringify(this.editMap));
                    
                })
                .catch(error=>{
                    console.log('error isss:'+JSON.stringify(error));
                })
            })
            console.log('map is::'+JSON.stringify(this.editMap));
            this.data = result.data.map(record => ({
                ...record,
                accountUrl: `/lightning/r/Account/${record.Id}/view`,
                OwnerName: record.Owner.Name,
                CanEdit: this.editMap[record.Id]
            })
            
            
            );
            if(this.data.length>0){
                    this.showTable = true;
                    this.showMsg=false;
                }
                else{
                    this.showMsg = true;
                    this.showTable=false;
                }
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.data = undefined;
        }
    }

    handleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.data];

        cloneData.sort((a, b) => {
            let aValue = a[sortedBy];
            let bValue = b[sortedBy];

            return aValue > bValue ? 1 : -1;
        });

        if (sortDirection === 'desc') {
            cloneData.reverse();
        }

        this.data = cloneData;
        this.sortBy = sortedBy;
        this.sortDirection = sortDirection;
    }

    handleSearch(event) {
        this.searchKey = event.target.value.toLowerCase();

        if (this.searchKey) {
            this.data = this.wiredAccountsResult.data
                .filter(account => account.Name.toLowerCase().includes(this.searchKey))
                .map(record => ({
                    ...record,
                    accountUrl: `/lightning/r/Account/${record.Id}/view`,
                    OwnerName: record.Owner.Name,
                    CanEdit: this.editMap[record.Id]
                }));
                if(this.data.length>0){
                    this.showTable = true;
                    this.showMsg=false;
                }
                else{
                    this.showMsg = true;
                    this.showTable=false;
                }
        } else {
            this.data = this.wiredAccountsResult.data.map(record => ({
                ...record,
                accountUrl: `/lightning/r/Account/${record.Id}/view`,
                OwnerName: record.Owner.Name,
                CanEdit: record.CanEdit
            }));
        }
    }

    async handleSave(event) {
        const updatedFields = event.detail.draftValues;
        console.log('updatedFields'+JSON.stringify(updatedFields));
        try {
            await updateAccounts({ accounts: updatedFields });
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Accounts updated',
                    variant: 'success'
                })
            );
            this.draftValues = [];
            return refreshApex(this.wiredAccountsResult);
        } catch (error) {
            this.error = error;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error updating records',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        }
    }
    
}
