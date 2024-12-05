create table projects
(
    id           varchar(64)  not null
        primary key,
    name         varchar(255) not null,
    default_path varchar(255) default '/' null
);

create table durations
(
    day        datetime     not null,
    label      varchar(255) not null,
    project_id varchar(64)  not null,
    duration   decimal      not null,
    type       enum ('BRANCH', 'FILE', 'LANGUAGE', 'URL')                             not null,
    primary key (day, label, project_id),
    constraint time_projects_id_fk
        foreign key (project_id) references projects (id)
);