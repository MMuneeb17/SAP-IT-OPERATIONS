const {test,expect}=require('@playwright/test');
const {randomUUID}=require('node:crypto');
test.use({actionTimeout:20000});
async function setup(page){const tenant='operations-ui-'+randomUUID();await page.route('**/odata/v4/it-operations/**',route=>{const u=new URL(route.request().url());u.searchParams.set('sap-client',tenant);return route.continue({url:u.toString()});});return tenant;}
async function choose(page,label,option){await page.getByRole('combobox',{name:label,exact:true}).press('F4');await page.getByRole('option',{name:option,exact:true}).click();}
test('SLA workbench previews a breach without saving and edits an audited policy',async({page,request})=>{
 const tenant=await setup(page),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await request.post('/odata/v4/it-operations/Tickets?sap-client='+tenant,{data:{Subject:'SLA browser example',Description:'Response tracking',Category:'Hardware',RequesterUUID:'00000001-0000-4000-8000-000000000002'}});expect(response.ok()).toBe(true);const ticket=await response.json();
 await page.goto('/test/flp.html#app-preview&/Operations',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('combobox',{name:'Ticket',exact:true})).toBeVisible({timeout:90000});
 await expect(page.getByText(ticket.TicketNumber,{exact:true})).toBeVisible({timeout:30000});
 await choose(page,'Ticket',ticket.TicketNumber+' — SLA browser example');
 await page.getByRole('textbox',{name:'Preview time (UTC ISO timestamp)',exact:true}).fill(new Date(Date.parse(ticket.CreatedAt)+3*3600000).toISOString());
 await page.getByRole('button',{name:'Preview future time',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Preview result (not saved)',exact:true})).toBeVisible();
 await expect(page.getByText('Response: BREACHED · Resolution: WITHIN_SLA',{exact:true})).toBeVisible();
 const live=await (await request.get(`/odata/v4/it-operations/Tickets(${ticket.TicketUUID})?sap-client=${tenant}`)).json();expect(live.SLAStatus).toBe('WITHIN_SLA');
 await page.screenshot({path:'test-results/phase-7-sla-preview.png'});
 await choose(page,'Record','MEDIUM');
 await page.getByRole('textbox',{name:'Response Minutes',exact:true}).fill('45');
 await page.getByRole('textbox',{name:'Change reason',exact:true}).last().fill('Response target agreed by service desk');
 await page.getByRole('button',{name:'Save configuration',exact:true}).click();
 await expect(page.getByText('Response target agreed by service desk',{exact:true})).toBeVisible();
 const policy=await (await request.get('/odata/v4/it-operations/SLAPolicies(00000013-0000-4000-8000-000000000003)?sap-client='+tenant)).json();expect(policy.ResponseMinutes).toBe(45);expect(policy.Revision).toBe(2);
 expect(errors).toEqual([]);
});
test('access design changes page and action decisions for employee, store and administrator',async({page})=>{
 await setup(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/test/flp.html#app-preview&/RoleAccess',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('combobox',{name:'Preview role',exact:true})).toBeVisible({timeout:90000});
 await expect(page.getByRole('listitem').filter({hasText:'My IT Support'})).toBeVisible();
 const issue=page.getByRole('row').filter({has:page.getByText('IssueReservation',{exact:true})});
 await expect(issue.getByText('Hidden / denied by role',{exact:true})).toBeVisible();
 await choose(page,'Preview role','MIS / Store Officer');
 await expect(issue.getByText('Visible / permitted by role',{exact:true})).toBeVisible();
 await expect(page.getByRole('listitem').filter({hasText:'My IT Support'})).toHaveCount(0);
 await choose(page,'Preview role','System Administrator');
 await expect(issue.getByText('Hidden / denied by role',{exact:true})).toBeVisible();
 const save=page.getByRole('row').filter({has:page.getByText('SaveSLAPolicies',{exact:true})});await expect(save.getByText('Visible / permitted by role',{exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/phase-8-access-design.png'});
 await page.setViewportSize({width:390,height:844});await page.getByRole('combobox',{name:'Preview role',exact:true}).scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/phase-8-access-mobile.png'});
 expect(errors).toEqual([]);
});
