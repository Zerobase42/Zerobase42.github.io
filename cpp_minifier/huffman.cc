#include<cmath>
#include<cstdint>
#include<iostream>
#include<stdexcept>
#include<string>
#include<vector>
#include<string>
#include<queue>
#include<unordered_map>
#include<windows.h>
using namespace std;
static const uint32_t pow2=7225;
static const uint32_t pow3=614125;
static const uint32_t pow4=52200625;
using Uint8Array=vector<uint8_t>;
Uint8Array charsetToMap(const string&charset){
    if(charset.size()!=85)throw invalid_argument("Charset length must be 85");
    Uint8Array ui8a(85);
    for(size_t i=0;i<85;i++)ui8a[i]=static_cast<uint8_t>(charset[i]);
    return ui8a;
}
Uint8Array ascii85=charsetToMap("!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu");
Uint8Array z85=charsetToMap("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#");
const Uint8Array&getMap(const string&charset="z85"){
    if(charset=="ascii85")return ascii85;
    if(charset.size()==85){
        static Uint8Array customMap;
        customMap=charsetToMap(charset);
        return customMap;
    }
    return z85;
}
Uint8Array getReverseMap(const Uint8Array&mapOrig){
    Uint8Array revMap(128,0);
    for(size_t i=0;i<mapOrig.size();i++){
        uint8_t charCode=mapOrig[i];
        if(charCode<128)revMap[charCode]=static_cast<uint8_t>(i);
    }
    return revMap;
}
string encode(const Uint8Array&ui8a,const string&charset="z85"){
    const Uint8Array&charMap=getMap(charset);
    size_t remain=ui8a.size()%4;
    size_t last5Length=remain?remain+1:0;
    size_t length=static_cast<size_t>(ceil(ui8a.size()*5.0/4.0));
    Uint8Array target(length);
    size_t to=ui8a.size()/4;
    for(size_t i=0;i<to;i++){
        uint32_t num=0;
        num|=static_cast<uint32_t>(ui8a[i*4])<<24;
        num|=static_cast<uint32_t>(ui8a[i*4+1])<<16;
        num|=static_cast<uint32_t>(ui8a[i*4+2])<<8;
        num|=static_cast<uint32_t>(ui8a[i*4+3]);
        for(int k=4;k>=0;k--){
            target[k+i*5]=charMap[num%85];
            num/=85;
        }
    }
    if(remain){
        size_t lastPartIndex=to*4;
        Uint8Array lastPart(4,0);
        for(size_t i=0;i<remain;i++){
            lastPart[i]=ui8a[lastPartIndex+i];
        }
        uint32_t num=0;
        num|=static_cast<uint32_t>(lastPart[0])<<24;
        num|=static_cast<uint32_t>(lastPart[1])<<16;
        num|=static_cast<uint32_t>(lastPart[2])<<8;
        num|=static_cast<uint32_t>(lastPart[3]);
        size_t offset=target.size()-last5Length-1;
        for(int i=4;i>=0;i--){
            uint8_t value=charMap[num%85];
            num/=85;
            if(i<static_cast<int>(last5Length)){
                size_t index=offset+i+1;
                target[index]=value;
            }
        }
    }
    return string(target.begin(),target.end());
}
Uint8Array decode(const string&base85,const string&charset="z85"){
    const Uint8Array&map=getMap(charset);
    Uint8Array revMap=getReverseMap(map);
    Uint8Array base85ab(base85.begin(),base85.end());
    size_t pad=(5-(base85ab.size()%5))%5;
    size_t outSize=(static_cast<size_t>(ceil(base85ab.size()/5.0))*4)-pad;
    Uint8Array ints(outSize);
    size_t i=0,fullBlocks=(base85ab.size()+4)/5;
    for(;i+1<fullBlocks;i++){
        uint32_t c1=revMap[base85ab[i*5+4]];
        uint32_t c2=revMap[base85ab[i*5+3]]*85;
        uint32_t c3=revMap[base85ab[i*5+2]]*pow2;
        uint32_t c4=revMap[base85ab[i*5+1]]*pow3;
        uint32_t c5=revMap[base85ab[i*5]]*pow4;
        uint32_t val=c1+c2+c3+c4+c5;
        ints[i*4]=static_cast<uint8_t>((val>>24)&0xFF);
        ints[i*4+1]=static_cast<uint8_t>((val>>16)&0xFF);
        ints[i*4+2]=static_cast<uint8_t>((val>>8)&0xFF);
        ints[i*4+3]=static_cast<uint8_t>(val&0xFF);
    }
    uint8_t lCh=map[map.size()-1];
    Uint8Array lastPart(base85ab.begin()+i*5,base85ab.end());
    lastPart.insert(lastPart.end(),4,lCh);
    uint32_t c1=revMap[lastPart[4]];
    uint32_t c2=revMap[lastPart[3]]*85;
    uint32_t c3=revMap[lastPart[2]]*pow2;
    uint32_t c4=revMap[lastPart[1]]*pow3;
    uint32_t c5=revMap[lastPart[0]]*pow4;
    uint32_t val=c1+c2+c3+c4+c5;
    uint8_t decoded[4]{
        static_cast<uint8_t>((val>>24)&0xFF),
        static_cast<uint8_t>((val>>16)&0xFF),
        static_cast<uint8_t>((val>>8)&0xFF),
        static_cast<uint8_t>(val&0xFF)
    };
    for(size_t j=0;j<4-pad;j++){
        ints[i*4+j]=decoded[j];
    }
    return ints;
}
struct Node{
	char character;
	int frequency;
	Node*left,*right;
};
struct cmp{
	bool operator()(Node*A,Node*B){
		return A->frequency>B->frequency;
	}
};
class HuffmanTree{
public:
	~HuffmanTree(){
		ReleaseTree(root);
		root=nullptr;
		um.clear();
		info.clear();
		while(!pq.empty())pq.pop();
	}
	const unordered_map<unsigned char,string>&GetInfo(){
		return info;
	}
	void Create(const string&str){
		for(const auto iter:str)++um[iter];	
		for(const auto iter:um){
			Node*newNode=new Node;
			newNode->left=nullptr;
			newNode->right=nullptr;
			newNode->character=iter.first;
			newNode->frequency=iter.second;
			pq.push(newNode);
		}
		MakeTree();
		string tmp="";
		FindTree(root,tmp);
	}
	string DecodeFromOuts(const string&outs,size_t originalLength){
        string bitstream;
        for(unsigned char c:outs){
            for(int i=7;i>=0;--i){
                bitstream+=((c>>i)&1)?'1':'0';
            }
        }
        string result;
        Node*current=root;
        for(char bit:bitstream){
            if(bit=='0')current=current->left;
            else current=current->right;
            if(current->left==nullptr&&current->right==nullptr){
                result+=current->character;
                current=root;
                if(result.size()==originalLength)break;
            }
        }
        return result;
    }
private:
	void MakeTree(){
		int limit=pq.size()-1;
		for(int i=0;i<limit;++i){
			Node*newNode=new Node;
			newNode->character=0;
			newNode->right=pq.top();pq.pop();
			newNode->left=pq.top();pq.pop();
			newNode->frequency=newNode->right->frequency+newNode->left->frequency;
			pq.push(newNode);
		}
		root=pq.top();
	}
	void FindTree(Node*p,string str){
		if(p==nullptr)return;
		FindTree(p->left,str+'0');
		FindTree(p->right,str+'1');
		if(p->character!=0){
			info[p->character]=str;
		}
	}
	void ReleaseTree(Node*p){
		if(p==nullptr)return;
		ReleaseTree(p->left);
		ReleaseTree(p->right);
		delete p;
		p=nullptr;
	}
	Node*root=nullptr;
	unordered_map<unsigned char,int>um;
	unordered_map<unsigned char,string>info;
	priority_queue<Node*,vector<Node*>,cmp>pq;
};
int main(int argc,char*argv[]){
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
	string str;getline(cin,str);
	HuffmanTree t;
	t.Create(str);
	unordered_map<unsigned char,string>info=t.GetInfo();
	cout<<"이진수 정보 : \n";
	for(const auto iter:info){
		cout<<iter.first<<": "<<iter.second<<endl;
	}
    string bitstream;
    for(const auto ch:str){
        bitstream+=info[ch];
    }
    cout<<"\n8비트 단위 변환 결과: \n";
    string outs;
	Uint8Array enc;
    for(size_t i=0;i<bitstream.size();i+=8){
        string byteStr=bitstream.substr(i,8);
        if(byteStr.size()<8){
            byteStr.append(8-byteStr.size(),'0');
        }
		enc.push_back(static_cast<unsigned char>(stoi(byteStr,nullptr,2)));
        unsigned char byteVal=static_cast<unsigned char>(stoi(byteStr,nullptr,2));
        outs+=byteVal;
    }
    cout<<outs<<'\n';
    cout<<"\n길이 비교\n str : "<<str.size()<<" outs : "<<outs.size();
    cout<<"\n압축률 : "<<(float)outs.size()/(float)str.size()*100<<"%\n";
    string decoded=t.DecodeFromOuts(outs,str.size());
    cout<<"\n복원된 문자열: "<<decoded;
    cout<<"\n복원 여부 : "<<(bool)(str==decoded)<<'\n';
	string encoded=encode(enc,"ascii85");
	cout<<"\nBase85로 인코딩된 문자열: "<<encoded<<'\n';
    Uint8Array decoded85=decode(encoded,"ascii85");
    string decodedStr(decoded85.begin(),decoded85.end());
	cout<<"\nBase85로 디코딩된 문자열: "<<decodedStr<<'\n';
	cout<<"\nbase85 압축률 : "<<(float)encoded.size()/(float)str.size()*100<<"%\n";
	cout<<"\n"<<(bool)(outs==decodedStr)<<'\n';
}