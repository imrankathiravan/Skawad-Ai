/* Fixed fictional data only. Replace the repository interface for a future secure backend.
   A real backend must authenticate/authorize teachers and keep real pupil data off this adapter. */
const AttendanceDemo = (() => {
    const statuses = Object.freeze(['Hadir', 'Tidak Hadir', 'Lewat', 'Bersebab']);
    const classes = Object.freeze([{id:'a', name:'Kelas Demo A'}, {id:'b', name:'Kelas Demo B'}].map(Object.freeze));
    const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date+'T00:00:00Z')) && new Date(date+'T00:00:00Z').toISOString().slice(0,10) === date;
    function validateSelection(selection) {
        if (!selection || !Number.isInteger(selection.year) || selection.year < 1 || selection.year > 6 || !classes.some(item=>item.id===selection.classId) || !validDate(selection.date)) throw new Error('Invalid demo selection');
    }
    function roster(year, classId) {
        validateSelection({year,classId,date:'2026-01-01'});
        return Array.from({length:6}, (_,index)=>Object.freeze({id:`demo-${year}-${classId}-${index+1}`, name:`Murid Rekaan ${String(index+1).padStart(2,'0')}`}));
    }
    function calculate(values) {
        if (!Array.isArray(values) || values.some(value=>value!=='' && !statuses.includes(value))) throw new Error('Invalid demo status');
        const count = status => values.filter(value=>value===status).length;
        const total=values.length, present=count('Hadir'), absent=count('Tidak Hadir'), late=count('Lewat'), excused=count('Bersebab'), unmarked=count('');
        return {total,present,absent,late,excused,unmarked,percentage:total ? Math.round((present+late)/total*1000)/10 : 0};
    }
    function validateRecord(record, selection) {
        validateSelection(selection);
        if (!record || typeof record!=='object' || Array.isArray(record) || Object.keys(record).sort().join()!=='classId,date,statuses,version,year' || record.version!==1 || record.year!==selection.year || record.classId!==selection.classId || record.date!==selection.date) throw new Error('Invalid demo record');
        const pupils=roster(record.year, record.classId);
        if (!record.statuses || Array.isArray(record.statuses) || typeof record.statuses!=='object' || Object.keys(record.statuses).length!==pupils.length || !pupils.every(pupil=>Object.hasOwn(record.statuses,pupil.id) && statuses.includes(record.statuses[pupil.id]))) throw new Error('Only fixed demo pupils and statuses are allowed');
        return {version:1,year:record.year,classId:record.classId,date:record.date,statuses:Object.fromEntries(pupils.map(pupil=>[pupil.id,record.statuses[pupil.id]]))};
    }
    function today(now = new Date()) {
        const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
        const part=type=>parts.find(item=>item.type===type).value;
        return `${part('year')}-${part('month')}-${part('day')}`;
    }
    function createRepository(storage) {
        // No scanning other keys, names, free-text notes or browser announcement records.
        const key=selection=>{validateSelection(selection);return `skawad-attendance-demo-v1:${selection.year}:${selection.classId}:${selection.date}`;};
        return Object.freeze({
            async load(selection) {const raw=storage.getItem(key(selection)); return raw===null ? null : validateRecord(JSON.parse(raw),selection);},
            async save(selection, record) {const clean=validateRecord(record,selection); storage.setItem(key(selection),JSON.stringify(clean)); return clean;},
            async remove(selection) {storage.removeItem(key(selection));}
        });
    }
    return Object.freeze({statuses,classes,roster,calculate,validateSelection,validateRecord,today,createRepository});
})();

if (typeof document!=='undefined' && document.getElementById('attendanceForm')) {
    (() => {
        const get=id=>document.getElementById(id);
        const year=get('attendanceYear'), klass=get('attendanceClass'), date=get('attendanceDate'), form=get('attendanceForm'), list=get('attendanceRoster'), state=get('attendanceState'), save=get('saveAttendance'), remove=get('deleteAttendance');
        const repository=AttendanceDemo.createRepository({getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value),removeItem:key=>window.localStorage.removeItem(key)});
        let selection, draft={}, dirty=false, saved=false, busy=false, failed=false;
        const option=(value,text)=>{const el=document.createElement('option');el.value=value;el.textContent=text;return el;};
        for(let n=1;n<=6;n++) year.appendChild(option(n,'Tahun '+n));
        AttendanceDemo.classes.forEach(item=>klass.appendChild(option(item.id,item.name)));
        date.value=AttendanceDemo.today();
        function message(text) {state.textContent=text;}
        function controls() {
            [year,klass,date].forEach(el=>el.disabled=busy);
            list.querySelectorAll('select').forEach(el=>el.disabled=busy || failed);
            save.disabled=busy || failed || !dirty || Object.values(draft).some(value=>!value);
            remove.disabled=busy || !selection;
            form.setAttribute('aria-busy',String(busy));
        }
        function stats() {
            const summary=AttendanceDemo.calculate(Object.values(draft));
            for(const name of ['total','present','absent','late','excused','unmarked']) get('stat'+name[0].toUpperCase()+name.slice(1)).textContent=summary[name];
            get('statPercentage').textContent=summary.percentage+'%';
            get('attendanceProgress').value=summary.percentage;
            get('attendanceProgress').textContent=summary.percentage+'%';
        }
        function render() {
            list.replaceChildren();
            AttendanceDemo.roster(selection.year,selection.classId).forEach(pupil=>{
                const row=document.createElement('div');row.className='attendance-pupil';
                const label=document.createElement('label');label.htmlFor=pupil.id;label.textContent=pupil.name;
                const select=document.createElement('select');select.id=pupil.id;select.required=true;select.dataset.demoId=pupil.id;
                select.appendChild(option('','Pilih status'));
                AttendanceDemo.statuses.forEach(status=>select.appendChild(option(status,status)));
                select.value=draft[pupil.id];
                select.addEventListener('change',()=>{draft[pupil.id]=select.value;dirty=true;message('Perubahan belum disimpan. Tandakan semua murid dan simpan rekod demo.');stats();controls();});
                row.append(label,select);list.appendChild(row);
            });
            stats();controls();
        }
        async function load(next) {
            selection=next;busy=true;failed=false;dirty=false;saved=false;
            draft=Object.fromEntries(AttendanceDemo.roster(next.year,next.classId).map(pupil=>[pupil.id,'']));
            render();message('Memuatkan rekod demo…');
            try {const record=await repository.load(next);if(record){draft=record.statuses;saved=true;}message(record?'Rekod demo tersimpan dimuatkan. Anda boleh mengedit status.':'Belum ada rekod demo bagi pilihan ini. Sila tandakan semua murid.');}
            catch(error){failed=true;message('Rekod demo tidak dapat dibaca. Storan mungkin disekat atau rekod rosak. Padam rekod demo bagi pilihan ini untuk mencuba semula.');}
            finally{busy=false;render();}
        }
        async function changeSelection() {
            if(busy)return;
            const next={year:Number(year.value),classId:klass.value,date:date.value};
            try{AttendanceDemo.validateSelection(next);}catch(error){message('Sila pilih tarikh yang sah.');save.disabled=true;return;}
            if(dirty && !window.confirm('Perubahan demo belum disimpan. Tukar pilihan dan abaikan perubahan?')){year.value=selection.year;klass.value=selection.classId;date.value=selection.date;controls();return;}
            await load(next);
        }
        [year,klass,date].forEach(el=>el.addEventListener('change',changeSelection));
        form.addEventListener('submit',async event=>{
            event.preventDefault();if(busy || failed || !dirty || Object.values(draft).some(value=>!value))return;
            // Verify visible selection before writing so an empty/invalid date cannot save elsewhere.
            if(date.value!==selection.date || Number(year.value)!==selection.year || klass.value!==selection.classId){message('Sila pilih tahun, kelas dan tarikh yang sah dahulu.');return;}
            busy=true;controls();
            try{await repository.save(selection,{version:1,...selection,statuses:draft});dirty=false;message(saved?'Rekod demo telah dikemas kini dalam pelayar ini.':'Rekod demo telah disimpan dalam pelayar ini.');saved=true;}
            catch(error){message('Rekod demo gagal disimpan. Storan pelayar mungkin penuh atau disekat. Perubahan anda masih dipaparkan dan belum disimpan.');}
            finally{busy=false;controls();}
        });
        remove.addEventListener('click',async()=>{
            if(busy || !selection)return;
            if(date.value!==selection.date || Number(year.value)!==selection.year || klass.value!==selection.classId){message('Sila pilih tarikh yang sah dahulu.');return;}
            if(!window.confirm('Padam rekod demo bagi tahun, kelas dan tarikh ini?'))return;
            busy=true;controls();
            try{await repository.remove(selection);await load(selection);message('Rekod demo dipadam. Anda boleh menanda semula.');}
            catch(error){message('Rekod demo gagal dipadam. Storan pelayar mungkin disekat.');}
            finally{busy=false;controls();}
        });
        load({year:1,classId:'a',date:date.value});
    })();
}
