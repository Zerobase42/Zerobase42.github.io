#include<windows.h>
#include<iostream>
#include<queue>
#include<string>
#include<unordered_map>
#include<vector>
#include<algorithm>
using namespace std;
struct Node{
    string token;
    int frequency;
    Node*left;
    Node*right;
};
struct TokenInfo{
    string token;
    int freq;
    int gain;
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
    const unordered_map<string,string>&GetInfo(){
        return info;
    }
    void Create(const string&str,int maxN=4){
        for(int n=1;n<=maxN;++n)
            CountTokens(str,n);
        vector<TokenInfo>candidates;
        for(const auto&p:um){
            int len=(int)p.first.size();
            int freq=p.second;
            candidates.push_back({p.first,freq,(len-1)*freq});
        }
        sort(
            candidates.begin(),
            candidates.end(),
            [](const TokenInfo&a,const TokenInfo&b){
                if(a.gain!=b.gain)
                    return a.gain>b.gain;
                return a.freq>b.freq;
            });
        unordered_map<string,bool>selected;
        for(const auto&t:candidates){
            if(t.token.size()==1){
                selected[t.token]=true;
                continue;
            }
            if(t.gain<6)continue;
            selected[t.token]=true;
        }
        unordered_map<string,int>actualFreq;
        BuildActualFrequency(
            str,
            selected,
            actualFreq);
        vector<pair<string,int>>freqList(actualFreq.begin(),actualFreq.end());
        sort(freqList.begin(),freqList.end(),
            [](const auto&a,const auto&b){
                if(a.second!=b.second)return a.second>b.second;
                return a.first.size()>b.first.size();
            });
        cout<<"\n=== 실제 사용 빈도 ===\n";
        for(const auto&p:freqList){
            cout<<'"'<<p.first<<'"'<<" -> "<<p.second<<'\n';
            Node*node=new Node;
            node->token=p.first;
            node->frequency=p.second;
            node->left=nullptr;
            node->right=nullptr;
            pq.push(node);
        }
        MakeTree();
        string tmp;
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
            if(bit=='0')
                current=current->left;
            else
                current=current->right;
            if(current->left==nullptr&&current->right==nullptr){
                result+=current->token;
                current=root;
                if(result.size()>=originalLength)break;
            }
        }
        return result;
    }
    string encodeTo8BitString(const string&str){
        string bitstream;
        size_t maxTokenLength=1;
        for(const auto&p:info)
            maxTokenLength=max(maxTokenLength,p.first.size());
        size_t i=0;
        while(i<str.size()){
            bool found=false;
            for(size_t len=
                     min(maxTokenLength,str.size()-i);
                 len>=1;
                --len){
                string token=str.substr(i,len);
                auto it=info.find(token);
                if(it!=info.end()){
                    bitstream+=it->second;
                    i+=len;
                    found=true;
                    break;
                }
                if(len==1)
                    break;
            }
            if(!found){
                string token(1,str[i]);
                bitstream+=info[token];
                ++i;
            }
        }
        string outs;
        for(size_t i=0;i<bitstream.size();i+=8){
            string byteStr=bitstream.substr(i,8);
            if(byteStr.size()<8)
                byteStr.append(8-byteStr.size(),'0');
            unsigned char byteVal=
                static_cast<unsigned char>(
                    stoi(byteStr,nullptr,2));
            outs+=byteVal;
        }
        return outs;
    }
   private:
    unordered_map<string,int>um;
    unordered_map<string,string>info;
    priority_queue<Node*,vector<Node*>,cmp>pq;
    Node*root=nullptr;
    void BuildActualFrequency(const string&str,const unordered_map<string,bool>&selected,unordered_map<string,int>&actualFreq){
        size_t maxLen=1;
        for(const auto&p:selected){
            maxLen=max(maxLen,p.first.size());
        }
        size_t i=0;
        while(i<str.size()){
            bool found=false;
            for(size_t len=min(maxLen,str.size()-i);
                len>=1;
                --len){
                string token=str.substr(i,len);
                auto it=selected.find(token);
                if(it!=selected.end()){
                    ++actualFreq[token];
                    i+=len;
                    found=true;
                    break;
                }
                if(len==1)
                    break;
            }
            if(!found){
                string token(1,str[i]);
                ++actualFreq[token];
                ++i;
            }
        }
    }
    void CountTokens(const string&str,int n){
        for(size_t i=0;i+n<=str.size();++i){
            string token=str.substr(i,n);
            ++um[token];
        }
    }
    void MakeTree(){
        int limit=pq.size()-1;
        for(int i=0;i<limit;++i){
            Node*newNode=new Node;
            newNode->token="";
            newNode->right=pq.top();
            pq.pop();
            newNode->left=pq.top();
            pq.pop();
            newNode->frequency=newNode->right->frequency+newNode->left->frequency;
            pq.push(newNode);
        }
        root=pq.top();
    }
    void FindTree(Node*p,string str){
        if(p==nullptr)return;
        FindTree(p->left,str+'0');
        FindTree(p->right,str+'1');
        if(!p->token.empty()){
            info[p->token]=str;
        }
    }
    void ReleaseTree(Node*p){
        if(p==nullptr)return;
        ReleaseTree(p->left);
        ReleaseTree(p->right);
        delete p;
        p=nullptr;
    }
};
int main(){
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
    string str;
    getline(cin,str);
    HuffmanTree t;
    t.Create(str);
    unordered_map<string,string>info=t.GetInfo();
    cout<<"\n8비트 단위 변환 결과:\n";
    string outs=t.encodeTo8BitString(str);
    cout<<outs<<'\n';
    cout<<"\n길이 비교\n str : "<<str.size()<<" outs : "<<outs.size();
    cout<<"\n압축률 : "<<(float)outs.size()/(float)str.size()*100<<"%\n";
    string decoded=t.DecodeFromOuts(outs,str.size());
    cout<<"\n복원된 문자열: "<<decoded;
    cout<<"\n"
        <<(str==decoded);
}