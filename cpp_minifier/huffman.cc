#include<iostream>
#include<string>
#include<queue>
#include<unordered_map>
#include<windows.h>
#include "base85.cpp"
using namespace std;
//노드 정보
struct Node{
	char character;
	int frequency;
	Node*left,*right;
};
//우선순위 큐 정렬을 위한 구조체
//빈도수를 기준으로 최소힙으로 정렬한다.
struct cmp{
	bool operator()(Node*A,Node*B){
		return A->frequency>B->frequency;
	}
};
class HuffmanTree{
public:
	~HuffmanTree(){
		//동적할당 받은 노드들을 지운다.
		ReleaseTree(root);
		root=nullptr;
		um.clear();
		info.clear();
		while(!pq.empty())pq.pop();
	}
	const unordered_map<unsigned char,string>&GetInfo(){
		//허프만 트리로 얻은 알파벳 별 이진수 정보를 가져온다.
		return info;
	}
	//압축할 문자열 정보를 바탕으로 허프만 트리를 만들어
	//이진수 정보들을 만든다.
	void Create(const string&str){
		//해쉬 테이블을 이용해 빈도수를 기록
		for(const auto iter:str)++um[iter];	
		for(const auto iter:um){
			//해쉬 테이블에서 하나씩 꺼내 
			//정보를 노드에 저장 후
			//우선순위 큐에 집어 넣는다.
			Node*newNode=new Node;
			newNode->left=nullptr;
			newNode->right=nullptr;
			newNode->character=iter.first;
			newNode->frequency=iter.second;
			pq.push(newNode);
		}
		//우선순위 큐 정보를 바탕으로 트리를 만든다.
		MakeTree();
		//트리를 순회하면서 이진수 정보를 입력받는다.
		string tmp="";
		FindTree(root,tmp);
	}
	string DecodeFromOuts(const string&outs,size_t originalLength){
        //outs → 비트열 변환
        string bitstream;
        for(unsigned char c:outs){
            //각 바이트를 8비트 이진 문자열로 변환
            for(int i=7;i>=0;--i){
                bitstream+=((c>>i)&1)?'1':'0';
            }
        }
        //허프만 트리를 따라가며 디코딩
        string result;
        Node*current=root;
        for(char bit:bitstream){
            if(bit=='0')current=current->left;
            else current=current->right;
            //리프 노드 도달 시 문자 복원
            if(current->left==nullptr&&current->right==nullptr){
                result+=current->character;
                current=root;
                //원래 문자열 길이만큼 복원되면 중단(패딩 제거)
                if(result.size()==originalLength)break;
            }
        }
        return result;
    }
private:
	void MakeTree(){
		//우선 순위 큐를 이용해 빈도수가 작은 순으로 
		//2개씩 꺼내 두 노드를 담는 노드를 만들어
		//두 노드의 빈도수를 합치고 큐에 다시 집어 넣는다.
		int limit=pq.size()-1;
		for(int i=0;i<limit;++i){
			Node*newNode=new Node;
			newNode->character=0;
			newNode->right=pq.top();pq.pop();
			newNode->left=pq.top();pq.pop();
			newNode->frequency=newNode->right->frequency+newNode->left->frequency;
			pq.push(newNode);
		}
		//이 작업을 마치면 우선순위 큐에는 한가지 원소만 남는다.
		//그것이 허프만 트리의 Root 노드가 된다.
		root=pq.top();
	}
	void FindTree(Node*p,string str){
		if(p==nullptr)return;
		//왼쪽은 0,오른쪽은 1
		//순회하면서 정보를 더해간다.
		FindTree(p->left,str+'0');
		FindTree(p->right,str+'1');
		//알파벳 정보를 가진 노드를 만날때까지 순회한다.
		if(p->character!=0){
			info[p->character]=str;
		}
	}
	void ReleaseTree(Node*p){
		//후위 순화를 하면서 동적할당 했던 노드들을
		//할당 해제 시켜준다.
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
    /*if(argc!=2){
        cerr<<"wrong input";
        return 0;
    }
	string str(argv[1]);*/
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
    string decoded=t.DecodeFromOuts(outs,str.size());
    cout<<"\n복원된 문자열: "<<decoded;
    cout<<"\n복원 여부 : "<<(bool)(str==decoded)<<'\n';
/*
	string encoded=encode(Uint8Array(str.begin(),str.end()),"ascii85");
	cout<<"\nBase85로 인코딩된 문자열: "<<encoded<<' '<<encoded.size()<<'\n';
	string decodedBase85=string(decode(encoded,"ascii85").begin(),decode(encoded,"ascii85").end());
	cout<<"\nBase85로 디코딩된 문자열: "<<decodedBase85<<'\n';
	cout<<"\n"<<(str==decodedBase85)<<'\n';
*/
	string encoded=encode(enc,"ascii85");
	cout<<"\nBase85로 인코딩된 문자열: "<<encoded<<'\n';
    Uint8Array decoded85=decode(encoded,"ascii85");
    string decodedStr(decoded85.begin(),decoded85.end());
	//cout<<"\nBase85로 디코딩된 문자열: "<<decodedStr<<'\n';
	cout<<"\n"<<(bool)(outs==decodedStr)<<'\n';
	cout<<"\n원본 크기      : "<<str.size()<<" bytes";
	cout<<"\n허프만 비트 수 : "<<bitstream.size()<<" bits";
	cout<<"\n허프만 바이트 수 : "<<outs.size()<<" bytes";
	cout<<"\n비트 기준 압축률 : "<<100.0*bitstream.size()/(str.size()*8)<<"%";
	cout<<"\n실제 저장 크기 기준 압축률 : "<<100.0*outs.size()/str.size()<<"%";
	cout<<"\nBase85 포함 압축률 : "<<100.0*encoded.size()/str.size()<<"%";
}