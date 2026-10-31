<?php
declare(strict_types=1);
require_once __DIR__.'/../api/pending-request-edit.php';
class PendingInstallStatement extends PDOStatement {
    public function fetchAll(int $mode=PDO::FETCH_DEFAULT,mixed ...$args):array{return [];}
}
class PendingInstallDatabase extends PDO {
    public int $alters=0;
    public function __construct(private int $driverCode){}
    public function inTransaction():bool{return false;}
    public function query(string $query,?int $fetchMode=null,mixed ...$fetchModeArgs):PDOStatement|false{return new PendingInstallStatement();}
    public function exec(string $query):int|false {
        if(str_starts_with($query,'ALTER TABLE')){
            $this->alters++;$error=new PDOException('Synthetic concurrent column installation');$error->errorInfo=['42S21',$this->driverCode,'synthetic'];throw $error;
        }
        return 0;
    }
}
$db=new PendingInstallDatabase(1060);pending_request_install($db,'leave');
if($db->alters!==3)throw new RuntimeException('Concurrent additive installation must finish all metadata columns');
try{pending_request_install(new PendingInstallDatabase(1142),'leave');throw new LogicException('Expected schema permission failure');}
catch(PDOException $error){if($error->errorInfo[1]!==1142)throw $error;}
echo "Pending schema install: tolerate only concurrent duplicate columns; preserve real schema errors.\n";
