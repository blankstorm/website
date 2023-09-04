/**
 * Exposes the database to the backend
 */
import mariadb from 'mariadb';

export default mariadb.createPool({
	user: import.meta.env.db_user,
	password: import.meta.env.db_password,
	database: import.meta.env.db_name,
});
