
    create table appointment (
        token_num integer,
        department_id bigint,
        doctor_id bigint not null,
        hospital_id bigint,
        id bigserial not null,
        patient_fk bigint,
        date_str varchar(255) not null,
        patient_name varchar(255),
        source varchar(255),
        status varchar(255) not null,
        token_code varchar(255) not null unique,
        primary key (id)
    );

    create table cancellation (
        appointment_id bigint not null,
        cancelled_at timestamp(6),
        doctor_id bigint not null,
        id bigserial not null,
        date_str varchar(255) not null,
        patient_name varchar(255),
        reason varchar(255),
        primary key (id)
    );

    create table department_condition (
        id bigserial not null,
        condition_name varchar(255) not null,
        department_name varchar(255) not null,
        primary key (id)
    );

    create table doctor (
        avg_minutes_per_patient integer,
        daily_limit integer not null,
        total_patients_treated integer,
        years_of_experience integer,
        dept_id bigint not null,
        id bigserial not null,
        photo_url varchar(500),
        bio TEXT,
        doctor_name varchar(255) not null,
        qualification varchar(255),
        primary key (id)
    );

    create table holiday (
        date date not null,
        id bigserial not null,
        name varchar(255) not null,
        state varchar(255),
        primary key (id)
    );

    create table hospital (
        latitude float(53),
        longitude float(53),
        rating float(53),
        id bigserial not null,
        accreditation varchar(255),
        address varchar(255),
        name varchar(255) not null,
        opd_hours varchar(255),
        state varchar(255),
        type varchar(255),
        primary key (id)
    );

    create table hospital_department (
        hospital_id bigint not null,
        id bigserial not null,
        department_name varchar(255) not null,
        primary key (id)
    );

    create table medical_report (
        report_date date not null,
        appointment_id bigint not null,
        created_at timestamp(6) not null,
        id bigserial not null,
        file_url varchar(500),
        report_type varchar(255) not null,
        text_content TEXT,
        title varchar(255) not null,
        primary key (id)
    );

    create table notification (
        is_read boolean not null,
        appointment_id bigint,
        created_at timestamp(6) not null,
        id bigserial not null,
        patient_fk bigint not null,
        message varchar(255) not null,
        type varchar(255) not null,
        primary key (id)
    );

    create table patient (
        age integer not null,
        created_at timestamp(6) not null,
        id bigserial not null,
        user_account_id bigint not null,
        mobile varchar(10) not null,
        blood_group varchar(255),
        full_name varchar(255) not null,
        gender varchar(255) not null,
        relation varchar(255) not null,
        primary key (id)
    );

    create table prescription (
        prescribed_date date not null,
        appointment_id bigint not null,
        id bigserial not null,
        dosage varchar(255),
        duration varchar(255),
        frequency varchar(255),
        instructions TEXT,
        medicine_name varchar(255) not null,
        primary key (id)
    );

    create table user_account (
        created_at timestamp(6) not null,
        default_patient_id bigint,
        id bigserial not null,
        mobile varchar(10),
        email varchar(255) not null unique,
        full_name varchar(255) not null,
        password_hash varchar(255) not null,
        primary key (id)
    );

    create index idx_doctor_date 
       on appointment (doctor_id, date_str);

    alter table if exists appointment 
       add constraint FKoeb98n82eph1dx43v3y2bcmsl 
       foreign key (doctor_id) 
       references doctor;

    alter table if exists doctor 
       add constraint FKjm8kdnwshjy93jj7kyibry868 
       foreign key (dept_id) 
       references hospital_department;

    alter table if exists hospital_department 
       add constraint FKby220gfjcilkxp89c2evwwfke 
       foreign key (hospital_id) 
       references hospital;
