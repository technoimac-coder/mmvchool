<?php
require __DIR__.'/../api/eoffice-line-ack.php';
class AckDb extends PDO {
 public $person=['id'=>'teacher','name'=>'Teacher'];public $book=['id'=>'book','title'=>'Letter','stage'=>'distributed','deleted_at'=>null];public $task=['id'=>1,'status'=>'pending'];public $writes=0;public $tx=false;
 public function __construct(){}
 public function prepare(string $query,array $options=[]):PDOStatement|false{return new AckStmt($this,$query);}
 public function beginTransaction():bool{$this->tx=true;return true;}
 public function commit():bool{$this->tx=false;return true;}
 public function rollBack():bool{$this->tx=false;return true;}
 public function inTransaction():bool{return $this->tx;}
}
class AckStmt extends PDOStatement{
 public function __construct(private AckDb $db,private string $sql){}
 public function execute(?array $params=null):bool{if(str_starts_with($this->sql,'UPDATE')){$this->db->task['status']='acknowledged';$this->db->writes++;}if(str_starts_with($this->sql,'INSERT'))$this->db->writes++;return true;}
 public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0):mixed{if(str_contains($this->sql,'FROM line_accounts'))return $this->db->person;if(str_contains($this->sql,'FROM eoffice_incoming'))return $this->db->book;return $this->db->task;}
}
function verify($condition){if(!$condition)throw new Exception('Assertion failed');}
$d=new AckDb();verify(str_contains(eoffice_line_ack($d,'line','book'),'บันทึกรับทราบแล้ว'));verify($d->writes===2);
eoffice_line_ack($d,'line','book');verify($d->writes===2);
foreach(['unlinked','not_assigned','deleted','archived'] as $scenario){$d=new AckDb();if($scenario==='unlinked')$d->person=false;if($scenario==='not_assigned')$d->task=false;if($scenario==='deleted')$d->book['deleted_at']='2026-10-26';if($scenario==='archived')$d->book['stage']='archived';eoffice_line_ack($d,'line','book');verify($d->writes===0);}
echo "PASS: LINE acknowledgement, duplicate delivery, linked identity, assignment, deletion and archive checks\n";
