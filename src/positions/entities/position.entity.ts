import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../auth/entities/user.entity";


@Entity('cat_roles')
export class Position {

    
    @PrimaryGeneratedColumn('identity')
    idu_rol: number;

    @Column({type: 'varchar', length:255})
    nom_rol: string;

    // @CreateDateColumn({ type: 'timestamp' })
    // created_at: Date;
  
    // @UpdateDateColumn({ type: 'timestamp' })
    // updated_at: Date;

    @OneToMany(
        () => User, user => user.position,
    )

    user:User[]

}
