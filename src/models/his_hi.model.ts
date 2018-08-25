import Knex = require('knex');

// ตัวอย่าง query แบบ knex
// getHospital(db: Knex,hn:any) {
//   return db('opdconfig as o')
//     .select('o.hospitalcode as hcode', 'o.hospitalname as hname')
// }
// ตัวอย่างการคิวรี่โดยใช้ raw MySqlConnectionConfig
// async getHospital(db: Knex,hn:any) {
//   let data = await knex.raw(`select * from opdconfig`);
// return data[0];
// }
export class HisHiModel {

    async getServices(db: Knex, hn: any, dateServe: any) {

        let data = await db.raw(`
        select o.vn as seq, o.vstdttm as date_serve, o.nrxtime as time_serv, c.namecln as department
        FROM ovst as o 
        Inner Join cln as c ON c.cln = o.cln 
        WHERE o.hn ='${hn}' and DATE(o.vstdttm) = '${dateServe}'`);
        return data[0];
    }

    getHospital(db: Knex, hn: any) {
        return db('setup as s')
            .select('s.hcode as provider_code', 'h.namehosp as provider_name')
            .leftJoin('hospcode as h', 'h.off_id', '=', 's.hcode')
    }

    getAllergyDetail(db: Knex, hn: any) {
        return db('allergy')
            .select('namedrug', 'detail')
            .where('hn', hn);
    }

    getChronic(db: Knex, hn: any) {
        return db('chronic as c')
            .select('c.chronic as icd_code', 'i.name_t as icd_name', 'c.date_diag as start_date')
            .innerJoin('icd101 as i', 'i.icd10', '=', 'c.chronic')
            .where('c.pid', hn);
    }


    getDiagnosis(db: Knex, hn: any, seq: any) {
        return db('ovstdx as o')
            .select('o.vn as seq', 'ovst.vstdttm as date_serve', 'ovst.nrxtime as time_serv', 'o.icd10 as icd_code', 'o.icd10name as icd_desc', 'o.cnt as diag_type')
            .innerJoin('ovst', 'ovst.vn', '=', 'o.vn')
            .where('o.vn', seq);
    }

    getRefer(db: Knex, hn: any, seq: any) {
        return db('orfro as o')
            .select('o.vn as seq', 'o.vstdate as date_serve', 'o.vsttime as time_serv', 'o.rfrlct as hcode_to', 'h.namehosp as name_to', 'f.namerfrcs as reason')
            .leftJoin('hospcode as h', 'h.off_id', '=', 'o.rfrlct')
            .leftJoin('rfrcs as f', 'f.rfrcs', '=', 'o.rfrcs')
            .where('o.vn', seq);
    }


    async getDrugs(db: Knex, hn: any, seq: any) {
        let data = await db.raw(`
        select p.vn as seq,p.prscdate as date_serve,prsctime as time_serv, pd.nameprscdt as drug_name,pd.qty as qty, med.pres_unt as unit ,m.doseprn1 as usage_line1 ,m.doseprn2 as usage_line2,'' as usage_line3
        FROM prsc as p 
        Left Join prscdt as pd ON pd.PRSCNO = p.PRSCNO 
        Left Join medusage as m ON m.dosecode = pd.medusage
        Left Join meditem as med ON med.meditem = pd.meditem
        WHERE p.vn = '${seq}' GROUP BY pd.qty`);
        return data[0];
    }

    async getLabs(db: Knex, hn: any, seq: any) {
        let data = await db.raw(`
        SELECT
        seq,date_serve,time_serv,lab_test as lab_name,
        hi.Get_Labresult(t.lab_table,t.labfield,t.lab_number) as lab_result,
        reference as standard_result
        FROM
        (SELECT DISTINCT
        l.ln as lab_number,
        l.vn as seq,
        l.hn as hn,
        
        DATE_FORMAT(date(l.vstdttm),'%Y%m%d') as date_serve,	
        DATE_FORMAT(time(l.vstdttm),'%i%s') as time_serv,

        lb.fieldname as lab_code_local,
        
        replace(lb.fieldlabel,"'",'\`') as lab_test, lb.filename as lab_table,
        lb.fieldname as labfield,
        concat(lb.normal,' ',lb.unit) as reference,
        replace(lab.labname,"'",'\`') as lab_group_name,
        l.labcode as lab_group
        FROM 
        hi.lbbk as l 
        inner join hi.lab on l.labcode=lab.labcode and l.finish=1 and l.vn='${seq}'
        inner join hi.lablabel as lb on l.labcode = lb.labcode
        group by l.ln,l.labcode,lb.filename,lb.fieldname
        ) as t `);
        return data[0];
    }


    getAppointment(db: Knex, hn: any, seq: any) {
        return db('oapp as o')
            .select('o.vn as seq', 'o.vstdate as date_serve', 'o.vsttime as time_serv', 'o.fudate as date', 'o.futime as time', 'o.cln as department', 'o.dscrptn as detail')
            .where('o.vn', seq);
    }

    async getVaccine(db: Knex, hn: any) {
        let data = await db.raw(`select 
        o.vstdttm as date_serve,
        o.drxtime as time_serv,
        cv.NEW as vaccine_code, 
        h.namehpt as vaccine_name
        from 
        hi.epi e 
        inner join 
        hi.ovst o on e.vn = o.vn 
        inner join 
        hi.cvt_vacc cv on e.vac = cv.OLD  
        left join 
        hi.hpt as h on e.vac=h.codehpt
        where 
        o.hn='${hn}'
        
        UNION

        select 
        o.vstdttm as date_serve,
        o.drxtime as time_serv,
        vc.stdcode as vacine_code, 
        vc.\`name\` as vacine_name
        from 
        hi.ovst o 
        inner join 
        hi.prsc pc on o.vn = pc.vn  
        inner join 
        hi.prscdt pd on pc.prscno = pd.prscno  
        inner join 
        hi.meditem m on pd.meditem = m.meditem 
        inner join 
        hi.vaccine vc on vc.meditem = m.meditem  
        where 
        o.hn='${hn}'`);
        return data[0];
    }
    async getProcedure(db: Knex, hn: any, seq: any) {
        let data = await db.raw(`
        SELECT
        o.hn as pid,
        o.vn as seq,
        DATE_FORMAT(date(o.vstdttm),'%Y%m%d') as date_serv,	
        o.nrxtime as time_serv, 
        p.icd9cm as procedcode,	
        p.icd9name as procedname,
        DATE_FORMAT(date(p.opdttm),'%Y%m%d') as start_date,	
        DATE_FORMAT(time(p.opdttm),'%i%s') as start_time
    from
        hi.ovst o 
    inner join 
        hi.ovstdx ox on o.vn = ox.vn 
    inner join
        hi.oprt p on o.vn = p.vn 
    left outer join
        hi.cln c on o.cln = c.cln
    LEFT OUTER JOIN 
        hi.dct on (
            CASE WHEN LENGTH(o.dct) = 5 THEN dct.lcno = o.dct 
                WHEN LENGTH(o.dct) = 4 THEN dct.dct = substr(o.dct,1,2)  
                WHEN LENGTH(o.dct) = 2 THEN dct.dct = o.dct END )
    where 
    o.vn = '${seq}' and p.an = 0 
    group by 
        p.vn,p.icd9cm 
    UNION 
    SELECT 
        o.hn as pid,
        o.vn as seq,
        DATE_FORMAT(date(o.vstdttm),'%Y%m%d') as date_serv,
        o.nrxtime as time_serv,  
        i.ICD10TM as procedcode,
        i.name_Tx as procedname,
        DATE_FORMAT(date(dt.vstdttm),'%Y%m%d') as start_date,	
        DATE_FORMAT(time(dt.vstdttm),'%i%s') as start_time
    
    FROM
        hi.dtdx 
    INNER JOIN 
        hi.icd9dent as i on dtdx.dttx=i.code_tx
    INNER JOIN 
        hi.dt on dtdx.dn=dt.dn
    INNER JOIN
        hi.ovst as o on dt.vn=o.vn and o.cln='40100'
    left outer join 
        hi.cln c on o.cln = c.cln  
    left join dentist as d on dt.dnt=d.codedtt
    where 
        o.vn = '${seq}'
    group by 
        dtdx.dn,procedcode
        `);
        return data[0];
    }

}