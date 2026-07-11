package com.metabuild.modules.admin.task20;

import static org.assertj.core.api.Assertions.*;

import com.metabuild.modules.admin.company.application.*;
import com.metabuild.modules.admin.dictionaries.application.*;
import com.metabuild.modules.admin.profile.application.*;
import com.metabuild.shared.kernel.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;

class Task20DomainContractTest {
  private static final UuidV7Generator IDS = new UuidV7Generator();

  @Test void dictionaryCodesAndItemValuesAreUniqueAndBuiltinDeleteIsProtected() {
    var repository = new MemoryDictionaries();
    var service = new DictionaryService(repository, IDS);
    var builtin = service.create("Status", "status", "", true);
    assertThatThrownBy(() -> service.create("Duplicate", "status", "", false))
        .isInstanceOf(Conflict.class).hasMessageContaining("code");
    var item = service.createItem(builtin.id(), "Active", "active", 1, true, "success", "");
    assertThatThrownBy(() -> service.createItem(builtin.id(), "Again", "active", 2, true, "neutral", ""))
        .isInstanceOf(Conflict.class).hasMessageContaining("value");
    assertThat(service.setItemEnabled(builtin.id(), item.id(), false).enabled()).isFalse();
    assertThatThrownBy(() -> service.delete(builtin.id()))
        .isInstanceOf(Conflict.class).hasMessageContaining("Built-in");
  }

  @Test void companyValidationRejectsInvalidDomainAndEmailWithoutMutation() {
    var repository = new MemoryCompany();
    var service = new CompanyService(repository);
    var before = repository.get();
    assertThatThrownBy(() -> service.update(IDS.generate(),new CompanyUpdate("Acme", false, "not domain", "ACME", "Software", "1-9", "CN", "2026-01-01", "Alice", "bad", "1", "", "Road", "200000")))
        .isInstanceOf(BadRequest.class);
    assertThat(repository.get()).isEqualTo(before);
    for(String email:List.of(".alice@example.com","alice..x@example.com","alice@-example.com","alice@example-.com","a@example.c"))
      assertThatThrownBy(()->service.update(IDS.generate(),new CompanyUpdate("Acme",false,"acme.test","ACME","Software","1-9","CN","2026-01-01","Alice",email,"1","","Road","200000"))).isInstanceOf(BadRequest.class);
    assertThat(repository.get()).isEqualTo(before);
  }

  @Test void profilePasswordUsesVerifierAndHasherAndCurrentDeviceCannotBeRemoved() {
    UUID user = IDS.generate();
    var repository = new MemoryProfiles(user);
    var sessions = new MemorySessions("current");
    var service = new ProfileService(repository, sessions, new PasswordCodec(){public String hash(String raw){return "hash:"+raw;}public boolean matches(String raw,String hash){return hash.equals("hash:"+raw);}});
    assertThatThrownBy(() -> service.changePassword(user, "wrong", "new-password"))
        .isInstanceOf(BadRequest.class).hasMessageContaining("Current password");
    service.changePassword(user, "old-password", "new-password");
    assertThat(repository.passwordHash).isEqualTo("hash:new-password");
    assertThatThrownBy(() -> service.removeDevice(user, "current"))
        .isInstanceOf(Conflict.class).hasMessageContaining("Current device");
    service.removeDevice(user, "other");
    assertThat(sessions.revoked).containsExactly("other");
  }

  @Test void everyV10TextWidthIsRejectedBeforeRepositoryMutation() {
    var dictionaries = new MemoryDictionaries();
    var dictionaryService = new DictionaryService(dictionaries, IDS);
    assertThatThrownBy(() -> dictionaryService.create("n".repeat(129), "valid", "", false)).isInstanceOf(BadRequest.class);
    assertThatThrownBy(() -> dictionaryService.create("valid", "a" + "b".repeat(128), "", false)).isInstanceOf(BadRequest.class);
    var dictionary = dictionaryService.create("valid", "valid", "", false);
    assertThatThrownBy(() -> dictionaryService.createItem(dictionary.id(), "l".repeat(129), "v", 0, true, "neutral", "")).isInstanceOf(BadRequest.class);
    assertThat(dictionaries.items).isEmpty();

    var company = new MemoryCompany();
    var companyService = new CompanyService(company);
    var before = company.get();
    assertThatThrownBy(() -> companyService.update(IDS.generate(), new CompanyUpdate("n".repeat(201), false, "acme.test", "ACME", "Software", "1-9", "CN", "2026-01-01", "Alice", "a@acme.test", "1", "", "Road", "200000"))).isInstanceOf(BadRequest.class);
    assertThat(company.get()).isEqualTo(before);

    UUID user = IDS.generate();
    var profiles = new MemoryProfiles(user);
    var profileService = new ProfileService(profiles, new MemorySessions("current"), new PasswordCodec(){public String hash(String raw){return raw;}public boolean matches(String raw,String hash){return true;}});
    assertThatThrownBy(() -> profileService.updatePreferences(user, new PreferenceView("zh-CN", "x".repeat(129), true, false))).isInstanceOf(BadRequest.class);
  }

  private static final class MemoryDictionaries implements DictionaryRepository {
    final Map<UUID, DictionaryView> dictionaries = new LinkedHashMap<>(); final Map<UUID, DictionaryItemView> items = new LinkedHashMap<>();
    public List<DictionaryView> list(){return List.copyOf(dictionaries.values());} public Optional<DictionaryView> find(UUID id){return Optional.ofNullable(dictionaries.get(id));}
    public DictionaryView insert(DictionaryView value){if(dictionaries.values().stream().anyMatch(x->x.code().equals(value.code())))throw new Conflict(()->"dictionary.code.conflict","Dictionary code already exists");dictionaries.put(value.id(),value);return value;}
    public DictionaryView update(UUID id,String name,String remark){var x=find(id).orElseThrow();var n=new DictionaryView(id,name,x.code(),remark,x.builtin());dictionaries.put(id,n);return n;}
    public boolean delete(UUID id){return dictionaries.remove(id)!=null;} public List<DictionaryItemView> items(UUID dictionaryId){return items.values().stream().filter(x->x.dictionaryId().equals(dictionaryId)).sorted(Comparator.comparingInt(DictionaryItemView::sort)).toList();}
    public Optional<DictionaryItemView> findItem(UUID dictionaryId,UUID id){return Optional.ofNullable(items.get(id)).filter(x->x.dictionaryId().equals(dictionaryId));}
    public DictionaryItemView insertItem(DictionaryItemView value){if(items(value.dictionaryId()).stream().anyMatch(x->x.value().equals(value.value())))throw new Conflict(()->"dictionary.item.value-conflict","Dictionary item value already exists");items.put(value.id(),value);return value;}
    public DictionaryItemView updateItem(DictionaryItemView value){items.put(value.id(),value);return value;} public boolean deleteItem(UUID dictionaryId,UUID id){return findItem(dictionaryId,id).map(x->items.remove(id)!=null).orElse(false);}
  }
  private static final class MemoryCompany implements CompanyRepository {
    CompanyView value=new CompanyView(IDS.generate(),"Acme",true,"acme.test","ACME","Software","1-9","CN","2026-01-01","Alice","a@acme.test","1","","Road","200000");
    public CompanyView get(){return value;} public CompanyView update(UUID actor,CompanyUpdate x){value=x.toView(value.id());return value;}
  }
  private static final class MemoryProfiles implements ProfileRepository {
    final UUID user; String passwordHash="hash:old-password"; MemoryProfiles(UUID user){this.user=user;}
    public ProfileView get(UUID id){return new ProfileView(id,"Alice","a@x.test","1","Acme","IT","Admin","Shanghai","E1","Dev","2020-01-01","","zh-CN","Asia/Shanghai","Bio",true,Instant.EPOCH.toString());}
    public ProfileView update(UUID id,ProfileUpdate x){return get(id);} public SecuritySettings security(UUID id){return new SecuritySettings(false,true,true);} public SecuritySettings updateSecurity(UUID id,SecuritySettings x){return x;}
    public PreferenceView preferences(UUID id){return new PreferenceView("zh-CN","Asia/Shanghai",true,false);} public PreferenceView updatePreferences(UUID id,PreferenceView x){return x;}
    public PasswordChange changePasswordWithRecovery(UUID id,String current,String replacement,String protectedSessionId,UUID workerId,java.time.Duration lease,PasswordCodec passwords){if(!passwords.matches(current,passwordHash))return new PasswordChange(false,null);passwordHash=passwords.hash(replacement);return new PasswordChange(true,new CredentialRevocation(IDS.generate(),id,protectedSessionId,1,workerId,1));}
    public List<CredentialRevocation> claimCredentialRevocations(UUID workerId,int limit,java.time.Duration lease){return List.of();}public boolean completeCredentialRevocation(CredentialRevocation task){return true;}public boolean failCredentialRevocation(CredentialRevocation task,String error){return true;}
  }
  private static final class MemorySessions implements ProfileSessionPort {
    final String current; final List<String> revoked=new ArrayList<>(); MemorySessions(String current){this.current=current;}
    public String currentSessionId(){return current;} public List<LoginDeviceView> devices(UUID user){return List.of(new LoginDeviceView("current","Chrome","Here","1",Instant.EPOCH.toString(),true),new LoginDeviceView("other","Safari","There","2",Instant.EPOCH.toString(),false));}
    public void revoke(UUID user,String id){revoked.add(id);}public void credentialsChanged(UUID user,String protectedSessionId,long targetRevision){}
  }
}
